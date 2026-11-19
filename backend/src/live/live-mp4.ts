/// <reference types="node" />
import { renameSync, rmSync } from 'node:fs'
import type { Part, VideoProps } from '@sherpas/shared'
import type { JobResult } from '../api/types'
import { VIDEO_TEMPLATE_DIR } from '../paths'
import { buildJobResult } from '../pipeline/job-result'
import type { RenderVideo } from '../pipeline/render-video'
import type { RunFolder } from '../pipeline/run-folder'
import { FPS, videoDurationSec } from '../pipeline/video-timeline'
import { SANDBOX_DIR } from '../scenes/sandbox'
import type { BrowserVerdicts } from './browser-verdicts'
import { formatSec, type LiveClock, type LiveLog } from './live-log'
import { assembleFinalCopy, describeMp4Scenes, scenesForMp4, type Mp4Scenes } from './live-mp4-copy'
import { acceptedLiveScenes } from './live-scene-files'

/**
 * The Live run's MP4, in the background (#17, docs/specs/live-run.md "Background MP4"): once parts 3–5
 * are resolved, the final copy of the template is assembled with the scenes the run accepted (less any
 * the page refused), bundled and rendered in the usual render queue, then kept as `video.mp4` with the
 * same `result.json` as a normal run. When `signal` aborts (the page closed), the bundle's result is not
 * used or the render is cancelled, and neither file is written: only log.txt says what happened.
 * Never throws.
 */

/**
 * Chrome tabs for the live render. The Player plays in the browser on the same laptop meanwhile, so
 * this leaves most of its 16 cores free. Measured on Daniel's Live run (2,535 frames): 143.6 s at 4,
 * 142.0 s at 8 (Remotion's default here): more tabs do not render faster.
 */
export const LIVE_RENDER_CONCURRENCY = 4
export const VIDEO_FILE = 'video.mp4'
export const RESULT_FILE = 'result.json'
/** The render writes here and the file is renamed only once it is complete: a cancelled render leaves no video.mp4. */
export const PARTIAL_VIDEO_FILE = 'video.partial.mp4'
const KEPT_FILES = [PARTIAL_VIDEO_FILE, VIDEO_FILE, RESULT_FILE] as const

export interface LiveMp4Deps {
  /** `renderWithRemotion`; a fake in tests. */
  readonly renderVideo: RenderVideo
  /** Bundles a template copy and resolves with its serve URL: `bundleTemplate`; a fake in tests. */
  readonly bundle: (templateDir: string) => Promise<string>
  readonly templateDir?: string
  readonly concurrency?: number
}

export interface LiveMp4Input {
  readonly folder: RunFolder
  /** The final props, as in video-props.json. */
  readonly props: VideoProps
  readonly member: string
  readonly partner: string | null
  readonly log: LiveLog
  readonly clock: LiveClock
  readonly browser: BrowserVerdicts
  /** Aborted when the session ends (the page closed): the MP4 is not kept. */
  readonly signal?: AbortSignal
}

export type LiveMp4Outcome =
  | { readonly status: 'kept'; readonly result: JobResult }
  | { readonly status: 'cancelled' }
  | { readonly status: 'failed'; readonly message: string }

type Attempt =
  | { readonly status: 'rendered'; readonly scenes: Mp4Scenes }
  | { readonly status: 'cancelled'; readonly stoppedSec: number }
  | { readonly status: 'refused'; readonly part: Part }
  | { readonly status: 'failed'; readonly message: string }

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error)).split('\n')[0]

/** Bundles the final copy (when it has a Claude scene) and renders it to the partial file; rejects once `signal` aborts. */
const renderScenes = async (input: LiveMp4Input, deps: LiveMp4Deps, scenes: Mp4Scenes, signal: AbortSignal): Promise<void> => {
  const { folder, log, clock, props } = input
  const copyDir = folder.path(SANDBOX_DIR)
  // A page already gone: no bundle (~12 s of CPU) for nothing.
  signal.throwIfAborted()
  // Without a Claude scene the MP4 is the template's own video, as in a normal run with the standard scenes.
  rmSync(copyDir, { recursive: true, force: true })
  const serveUrl = scenes.included.length > 0 ? await bundleCopy(input, deps, scenes, copyDir) : undefined
  signal.throwIfAborted()
  const frames = Math.round(videoDurationSec(props.scenes) * FPS)
  const concurrency = deps.concurrency ?? LIVE_RENDER_CONCURRENCY
  log(`render: rendering ${frames} frames (${serveUrl ? `${SANDBOX_DIR}/` : 'the template'}, concurrency ${concurrency})`)
  const startedSec = clock.elapsedSec()
  await deps.renderVideo(props, folder.path(PARTIAL_VIDEO_FILE), () => undefined, { serveUrl, signal, concurrency })
  signal.throwIfAborted()
  const renderSec = clock.elapsedSec() - startedSec
  log(`render: rendered in ${formatSec(renderSec)} s${renderSec > 0 ? ` (${formatSec(frames / renderSec)} fps)` : ''}`)
}

const bundleCopy = async (input: LiveMp4Input, deps: LiveMp4Deps, scenes: Mp4Scenes, copyDir: string): Promise<string> => {
  assembleFinalCopy(deps.templateDir ?? VIDEO_TEMPLATE_DIR, copyDir, input.props, scenes.included)
  input.log(`render: bundling the final copy (${SANDBOX_DIR}/)`)
  const startedSec = input.clock.elapsedSec()
  const serveUrl = await deps.bundle(copyDir)
  input.log(`render: bundled in ${formatSec(input.clock.elapsedSec() - startedSec)} s`)
  return serveUrl
}

/**
 * One assembly and render with the scenes known now. It stops when the session ends, and also when
 * the page refuses a scene that is in it (the MP4 then starts again without that scene).
 */
const renderAttempt = async (input: LiveMp4Input, deps: LiveMp4Deps): Promise<Attempt> => {
  const scenes = scenesForMp4(acceptedLiveScenes(input.folder.dir), input.browser.refused())
  input.log(`render: scenes in the MP4: ${describeMp4Scenes(scenes)}`)
  const attempt = new AbortController()
  let cancelledAtSec: number | undefined
  let refusedPart: Part | undefined
  const sessionEnded = (): void => {
    cancelledAtSec = input.clock.elapsedSec()
    attempt.abort()
  }
  if (input.signal?.aborted) sessionEnded()
  input.signal?.addEventListener('abort', sessionEnded, { once: true })
  const stopListening = input.browser.onRefused((part) => {
    if (!scenes.included.some((scene) => scene.part === part)) return
    refusedPart ??= part
    attempt.abort()
  })
  try {
    await renderScenes(input, deps, scenes, attempt.signal)
    return { status: 'rendered', scenes }
  } catch (error) {
    // Whatever the renderer had written of the MP4 so far.
    rmSync(input.folder.path(PARTIAL_VIDEO_FILE), { force: true })
    if (cancelledAtSec !== undefined) return { status: 'cancelled', stoppedSec: input.clock.elapsedSec() - cancelledAtSec }
    if (refusedPart) return { status: 'refused', part: refusedPart }
    return { status: 'failed', message: errorMessage(error) }
  } finally {
    stopListening()
    input.signal?.removeEventListener('abort', sessionEnded)
  }
}

/** The rendered MP4 becomes video.mp4, with the same result.json as a normal run. */
const keep = (input: LiveMp4Input, scenes: Mp4Scenes): LiveMp4Outcome => {
  const { folder, props } = input
  renameSync(folder.path(PARTIAL_VIDEO_FILE), folder.path(VIDEO_FILE))
  const result = buildJobResult({
    runId: folder.runId,
    caseId: props.brief.caseId,
    member: input.member,
    partner: input.partner,
    brief: props.brief,
    facts: props.facts,
    script: props.script,
    timings: props.scenes,
    videoUrl: `/runs/${folder.runId}/${VIDEO_FILE}`,
  })
  folder.writeJson(RESULT_FILE, result)
  // The normal pipeline's line: `demo:check` reads which scenes rendered, `demo:add` when the video was written.
  folder.log(`[render] ${VIDEO_FILE} written with ${scenes.included.length > 0 ? "Claude's scenes" : 'the standard scenes'}`)
  return { status: 'kept', result }
}

/**
 * Renders until the MP4 is kept, cancelled or failed. A restart only follows a refusal of a scene that
 * was in the MP4, and that scene is then left out for good: at most one restart per Claude scene.
 */
export const renderLiveMp4 = async (input: LiveMp4Input, deps: LiveMp4Deps): Promise<LiveMp4Outcome> => {
  const attempt = await renderAttempt(input, deps)
  switch (attempt.status) {
    case 'rendered':
      try {
        return keep(input, attempt.scenes)
      } catch (error) {
        // Both files or neither: a video without its result.json cannot go into the Demo.
        KEPT_FILES.forEach((file) => rmSync(input.folder.path(file), { force: true }))
        input.log(`render: could not keep the MP4: ${errorMessage(error)}`)
        return { status: 'failed', message: errorMessage(error) }
      }
    case 'refused':
      input.log(`render: the page refused ${attempt.part}, which was in the MP4: starting again without it`)
      return renderLiveMp4(input, deps)
    case 'cancelled':
      input.log(`render: cancelled, the page closed (stopped ${formatSec(attempt.stoppedSec)} s later): no ${VIDEO_FILE} or ${RESULT_FILE}`)
      return { status: 'cancelled' }
    case 'failed':
      input.log(`render: failed: ${attempt.message}: no ${VIDEO_FILE} or ${RESULT_FILE}`)
      return { status: 'failed', message: attempt.message }
  }
}
