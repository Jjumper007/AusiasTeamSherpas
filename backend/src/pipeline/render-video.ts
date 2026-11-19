/// <reference types="node" />
import { join } from 'node:path'
import { bundle } from '@remotion/bundler'
import { makeCancelSignal, renderMedia, renderStill, selectComposition, type CancelSignal } from '@remotion/renderer'
import type { VideoProps } from '@sherpas/shared'
import { VIDEO_TEMPLATE_DIR } from '../paths'

/** Reports how far the render is (0–1) and what it is doing, for the progress bar. */
export type RenderProgress = (fraction: number, label: string) => void

export interface RenderOptions {
  /**
   * A bundle of the run's own copy of the template, with Claude's scenes (#9). Without it, the
   * shared `video-template/` bundle renders the fallback video.
   */
  readonly serveUrl?: string
  /**
   * The Live run's MP4 (#17): aborting it stops the render (Remotion's cancel signal) and the promise
   * rejects; a render still waiting in the queue does not start. The normal pipeline passes none.
   */
  readonly signal?: AbortSignal
  /** Chrome tabs rendering at once; Remotion's default (half the cores, at most 8) when absent. */
  readonly concurrency?: number
}

/** Renders `props` to an MP4 at `outputFile`. Swappable so the pipeline can be tested without Chrome. */
export type RenderVideo = (
  props: VideoProps,
  outputFile: string,
  onProgress: RenderProgress,
  options?: RenderOptions,
) => Promise<void>

const COMPOSITION_ID = 'SherpasVideo'
/** Share of the progress bar spent bundling the template (only the first job of the server bundles it). */
const BUNDLE_SHARE = 0.25

const PUBLIC_DIR = 'public'

/** Bundles a Remotion project (the template or a run's copy of it) and resolves with its serve URL. */
export const bundleTemplate = (templateDir: string, onPercent?: (percent: number) => void): Promise<string> =>
  bundle({
    entryPoint: join(templateDir, 'src', 'index.ts'),
    rootDir: templateDir,
    // The music and sound effects stay in the shared template; a run's copy has only its sources.
    publicDir: join(VIDEO_TEMPLATE_DIR, PUBLIC_DIR),
    onProgress: onPercent,
  })

let bundled: Promise<string> | undefined

/** Bundles the shared `video-template/` once per server process; a failed bundle is retried on the next job. */
const bundleSharedTemplate = (onProgress: RenderProgress): Promise<string> => {
  bundled ??= bundleTemplate(VIDEO_TEMPLATE_DIR, (percent) =>
    onProgress((percent / 100) * BUNDLE_SHARE, 'Preparing the video'),
  ).catch((error: unknown) => {
    bundled = undefined
    throw error
  })
  return bundled
}

/** Chrome work runs one job at a time: two renders side by side would slow both and risk running out of memory. */
let queue: Promise<unknown> = Promise.resolve()

export const inRenderQueue = <T>(work: () => Promise<T>): Promise<T> => {
  const next = queue.then(work)
  queue = next.catch(() => undefined)
  return next
}

/** Remotion's cancel signal, fired when `signal` aborts (or at once if it already has). */
const cancelSignalOf = (signal: AbortSignal): CancelSignal => {
  const { cancelSignal, cancel } = makeCancelSignal()
  if (signal.aborted) cancel()
  else signal.addEventListener('abort', cancel, { once: true })
  return cancelSignal
}

/** Only what a caller asked for: without `signal` and `concurrency` the render is called exactly as before. */
const optionalRenderSettings = ({ signal, concurrency }: RenderOptions) => ({
  ...(signal ? { cancelSignal: cancelSignalOf(signal) } : {}),
  ...(concurrency === undefined ? {} : { concurrency }),
})

const renderNow: RenderVideo = async (props, outputFile, onProgress, options = {}) => {
  options.signal?.throwIfAborted()
  const serveUrl = options.serveUrl ?? (await bundleSharedTemplate(onProgress))
  const composition = await selectComposition({ serveUrl, id: COMPOSITION_ID, inputProps: props })
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    outputLocation: outputFile,
    inputProps: props,
    onProgress: ({ progress }) => onProgress(BUNDLE_SHARE + progress * (1 - BUNDLE_SHARE), 'Rendering your video'),
    ...optionalRenderSettings(options),
  })
}

/** Renders with Remotion (`@remotion/renderer`), queued behind any render already running. */
export const renderWithRemotion: RenderVideo = (props, outputFile, onProgress, options) =>
  inRenderQueue(() => renderNow(props, outputFile, onProgress, options))

/** The stills of a check render, and what the composition reports about itself. */
export interface CheckFramesResult {
  readonly serveUrl: string
  readonly durationSec: number
  /** One message per frame that failed to render. */
  readonly problems: readonly string[]
  /** PNG paths of the frames that rendered, in frame order. */
  readonly stills: readonly string[]
}

/** Renders check frames of a run's copy of the template; injected so the scenes step can be tested without Chrome. */
export type CheckFrames = (
  templateDir: string,
  props: VideoProps,
  frames: readonly number[],
  outDir: string,
) => Promise<CheckFramesResult>

interface StillOutcome {
  readonly still?: string
  readonly problem?: string
}

const firstLine = (error: unknown): string => (error instanceof Error ? error.message : String(error)).split('\n')[0]

/**
 * Bundles a run's copy of the template and renders `frames` as PNG stills into `outDir` (#9's
 * validator, and #10's input). The bundle is reused for the final render if the checks pass.
 */
export const renderCheckFrames: CheckFrames = async (templateDir, props, frames, outDir) => {
  const serveUrl = await bundleTemplate(templateDir)
  return inRenderQueue(async () => {
    const composition = await selectComposition({ serveUrl, id: COMPOSITION_ID, inputProps: props })
    const renderOne = async (frame: number): Promise<StillOutcome> => {
      const output = join(outDir, `frame-${frame}.png`)
      try {
        await renderStill({ composition, serveUrl, frame, output, inputProps: props })
        return { still: output }
      } catch (error) {
        return { problem: `Frame ${frame} failed to render: ${firstLine(error)}` }
      }
    }
    // One still at a time, in order: a single Chrome tab, like the final render.
    const outcomes = await frames.reduce<Promise<StillOutcome[]>>(
      async (done, frame) => {
        const previous = await done
        return [...previous, await renderOne(frame)]
      },
      Promise.resolve([]),
    )
    return {
      serveUrl,
      durationSec: composition.durationInFrames / composition.fps,
      problems: outcomes.flatMap((outcome) => (outcome.problem ? [outcome.problem] : [])),
      stills: outcomes.flatMap((outcome) => (outcome.still ? [outcome.still] : [])),
    }
  })
}
