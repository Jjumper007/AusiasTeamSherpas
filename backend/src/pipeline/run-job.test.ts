/// <reference types="node" />
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { VideoPropsSchema } from '@sherpas/shared'
import { afterEach, describe, expect, it } from 'vitest'
import type { JobEvent, JobRequest, JobResult } from '../api/types'
import { createJobStore } from '../jobs/job-store'
import type { RunClaude } from '../script/claude-cli'
import { estimateSceneTimings } from '../script/scene-timing'
import type { WriteScenes } from '../scenes/write-scenes'
import type { Narrate } from '../voice/narrate'
import type { RenderVideo } from './render-video'
import { runJob } from './run-job'
import { SCENES_START_SEC } from './video-timeline'

const FIXED_NOW = new Date('2026-11-18T16:05:03.123Z')
const dirs: string[] = []

const tempRunsDir = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'sherpas-runs-'))
  dirs.push(dir)
  return dir
}

afterEach(() => dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })))

/** Writes a placeholder file instead of rendering, after reporting some progress. */
const fakeRender: RenderVideo = async (_props, outputFile, onProgress) => {
  onProgress(0.5, 'Rendering your video')
  writeFileSync(outputFile, 'mp4')
}

/** Claude is not reachable in tests: every job falls back to the script without Claude. */
const offlineClaude: RunClaude = async () => {
  throw new Error('offline')
}

/** Times the scenes from the narration length instead of calling the voice. */
const fakeNarrate: Narrate = async (script, folder, onProgress) => {
  onProgress(1)
  return estimateSceneTimings(script).map((timing, index) => ({
    ...timing,
    audioFile: `http://localhost/runs/${folder.runId}/audio/scene-${index + 1}.mp3`,
  })) as ReturnType<typeof estimateSceneTimings>
}

/** Claude's scenes are not reachable in tests either: every job renders the template's own scenes. */
const fallbackScenes: WriteScenes = async (_props, folder) => ({
  source: 'fallback',
  attempts: 3,
  sandboxDir: folder.path('video-template'),
})

interface Fakes {
  readonly renderVideo?: RenderVideo
  readonly runClaude?: RunClaude
  readonly narrate?: Narrate
  readonly writeScenes?: WriteScenes
}

const run = async (
  request: JobRequest,
  { renderVideo = fakeRender, runClaude = offlineClaude, narrate = fakeNarrate, writeScenes = fallbackScenes }: Fakes = {},
) => {
  const store = createJobStore()
  const runsDir = tempRunsDir()
  const job = store.create(request)
  const events: JobEvent[] = []
  store.subscribe(job.id, (event) => events.push(event))
  await runJob(job, { store, narrate, renderVideo, runClaude, writeScenes, runsDir, now: () => FIXED_NOW })
  return { store, job: store.get(job.id), events, runsDir }
}

const emily: JobRequest = {
  caseId: 'daniel-emily-johnson',
  member: 'emily',
  answers: { explainLevel: 'simple', topOfMind: 'protection', decisionStyle: 'ask_trusted' },
}

describe('runJob', () => {
  it('runs brief → script → voice → scenes → render and ends with the result', async () => {
    const { events, job } = await run(emily)
    const steps = events.filter((event) => event.type === 'step').map((event) => `${event.step}:${event.status}`)
    expect(steps).toEqual([
      'brief:running',
      'brief:done',
      'script:running',
      'script:done',
      'voice:running',
      'voice:done',
      'scenes:running',
      'scenes:done',
      'render:running',
      'render:done',
    ])
    expect(events.at(-1)?.type).toBe('done')
    expect(job?.status).toBe('done')
  })

  it('sends progress that only goes up and ends at 1', async () => {
    const { events } = await run(emily)
    const values = events.flatMap((event) => (event.type === 'progress' ? [event.progress] : []))
    expect(values).toEqual([...values].sort((left, right) => left - right))
    expect(values.at(-1)).toBe(1)
  })

  it('writes survey, brief, facts, script, props, log, result and MP4 to its own run folder', async () => {
    const { runsDir, job } = await run(emily)
    const folder = join(runsDir, 'daniel-emily-johnson', 'emily', '2026-11-18T16-05-03-123Z')
    const files = ['survey.json', 'brief.json', 'facts.ts', 'script.json', 'video-props.json', 'log.txt', 'result.json', 'video.mp4']
    expect(files.filter((file) => !existsSync(join(folder, file)))).toEqual([])
    expect(JSON.parse(readFileSync(join(folder, 'survey.json'), 'utf8'))).toEqual({
      nickname: 'Emily',
      explainLevel: 'simple',
      topOfMind: 'protection',
      decisionStyle: 'ask_trusted',
    })
    expect(VideoPropsSchema.safeParse(JSON.parse(readFileSync(join(folder, 'video-props.json'), 'utf8'))).success).toBe(true)
    expect(job?.result?.videoUrl).toBe('/runs/daniel-emily-johnson/emily/2026-11-18T16-05-03-123Z/video.mp4')
  })

  it('returns what the player page needs: chapters on the video clock (after the logo opening), CTA, first step', async () => {
    const { job } = await run(emily)
    const result = job?.result as JobResult
    expect(result.chapters.map((chapter) => chapter.startSec)[0]).toBeCloseTo(SCENES_START_SEC, 1)
    expect(result.chapters.at(-1)?.startSec).toBeLessThan(result.durationSec)
    expect(result.cta).toEqual({ type: 'ask_trusted', text: 'Send this to Daniel and decide together.' })
    expect(result.firstStep.title).toBe('Raise mortality coverage')
    expect(result.partner).toBe('Daniel')
  })

  it("uses Claude's script when it passes the checks", async () => {
    const first = await run(emily)
    const folder = join(first.runsDir, 'daniel-emily-johnson', 'emily', '2026-11-18T16-05-03-123Z')
    const fallback = JSON.parse(readFileSync(join(folder, 'script.json'), 'utf8'))
    const claudeScript = { ...fallback, cta: { ...fallback.cta, text: 'Show this to Daniel tonight.' } }
    const { job } = await run(emily, { runClaude: async () => JSON.stringify(claudeScript) })
    expect(job?.result?.cta.text).toBe('Show this to Daniel tonight.')
  })

  it('falls back to the script without Claude, and says so in the log', async () => {
    const { runsDir, job } = await run(emily)
    const log = readFileSync(join(runsDir, 'daniel-emily-johnson', 'emily', '2026-11-18T16-05-03-123Z', 'log.txt'), 'utf8')
    expect(log).toContain('Claude failed 3 times')
    expect(job?.status).toBe('done')
  })

  it('reports a failed render as an error event with the step, and logs it', async () => {
    const broken: RenderVideo = async () => {
      throw new Error('Chrome crashed')
    }
    const { events, job, runsDir } = await run(emily, { renderVideo: broken })
    expect(events.at(-1)).toEqual({ type: 'error', message: 'Rendering your video failed: Chrome crashed' })
    expect(job?.status).toBe('failed')
    const log = readFileSync(join(runsDir, 'daniel-emily-johnson', 'emily', '2026-11-18T16-05-03-123Z', 'log.txt'), 'utf8')
    expect(log).toContain('Chrome crashed')
  })

  it('reports a failed narration as an error event and does not render', async () => {
    const silent: Narrate = async () => {
      throw new Error('LLM_PROXY_KEY is not set')
    }
    let rendered = false
    const render: RenderVideo = async () => {
      rendered = true
    }
    const { events } = await run(emily, { renderVideo: render, narrate: silent })
    expect(events.at(-1)).toEqual({
      type: 'error',
      message: 'Recording the narration failed: LLM_PROXY_KEY is not set',
    })
    expect(rendered).toBe(false)
  })

  it("renders Claude's scenes from their own bundle when they pass the checks", async () => {
    let serveUrl: string | undefined
    const render: RenderVideo = async (_props, outputFile, _progress, options) => {
      serveUrl = options?.serveUrl
      writeFileSync(outputFile, 'mp4')
    }
    const claudeScenes: WriteScenes = async (_props, folder) => ({
      source: 'claude',
      attempts: 1,
      sandboxDir: folder.path('video-template'),
      serveUrl: 'file:///bundle',
    })
    const { events, job } = await run(emily, { renderVideo: render, writeScenes: claudeScenes })
    expect(serveUrl).toBe('file:///bundle')
    expect(events).toContainEqual({ type: 'step', step: 'scenes', label: 'Designing your scenes', status: 'done' })
    expect(job?.status).toBe('done')
  })

  it('renders the standard scenes when Claude fails, and says so over SSE', async () => {
    let serveUrl: string | undefined = 'unset'
    const render: RenderVideo = async (_props, outputFile, _progress, options) => {
      serveUrl = options?.serveUrl
      writeFileSync(outputFile, 'mp4')
    }
    const { events } = await run(emily, { renderVideo: render })
    expect(serveUrl).toBeUndefined()
    expect(events).toContainEqual({
      type: 'step',
      step: 'scenes',
      label: 'Designing your scenes',
      status: 'done',
      note: 'Using the standard scenes',
    })
  })

  it('passes the voice timings to the render', async () => {
    const { runsDir } = await run(emily)
    const props = JSON.parse(
      readFileSync(join(runsDir, 'daniel-emily-johnson', 'emily', '2026-11-18T16-05-03-123Z', 'video-props.json'), 'utf8'),
    )
    expect(props.scenes[0].audioFile).toMatch(/audio\/scene-1\.mp3$/)
  })

  it('fails at the brief step for a child, without creating a run folder', async () => {
    const { events, runsDir } = await run({ ...emily, member: 'oliver' })
    expect(events.at(-1)).toMatchObject({ type: 'error', message: expect.stringContaining('Reading your plan failed') })
    expect(existsSync(join(runsDir, 'daniel-emily-johnson'))).toBe(false)
  })
})
