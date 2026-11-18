/// <reference types="node" />
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { VideoPropsSchema } from '@sherpas/shared'
import { afterEach, describe, expect, it } from 'vitest'
import type { JobEvent, JobRequest, JobResult } from '../api/types'
import { createJobStore } from '../jobs/job-store'
import type { RenderVideo } from './render-video'
import { runJob } from './run-job'

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

const run = async (request: JobRequest, renderVideo: RenderVideo = fakeRender) => {
  const store = createJobStore()
  const runsDir = tempRunsDir()
  const job = store.create(request)
  const events: JobEvent[] = []
  store.subscribe(job.id, (event) => events.push(event))
  await runJob(job, { store, renderVideo, runsDir, now: () => FIXED_NOW })
  return { store, job: store.get(job.id), events, runsDir }
}

const emily: JobRequest = {
  caseId: 'daniel-emily-johnson',
  member: 'emily',
  answers: { explainLevel: 'simple', topOfMind: 'protection', decisionStyle: 'ask_trusted' },
}

describe('runJob', () => {
  it('runs brief → script → render and ends with the result', async () => {
    const { events, job } = await run(emily)
    const steps = events.filter((event) => event.type === 'step').map((event) => `${event.step}:${event.status}`)
    expect(steps).toEqual(['brief:running', 'brief:done', 'script:running', 'script:done', 'render:running', 'render:done'])
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

  it('returns what the player page needs: chapters on the video clock, CTA, first step', async () => {
    const { job } = await run(emily)
    const result = job?.result as JobResult
    expect(result.chapters.map((chapter) => chapter.startSec)[0]).toBe(0)
    expect(result.chapters.at(-1)?.startSec).toBeLessThan(result.durationSec)
    expect(result.cta).toEqual({ type: 'ask_trusted', text: 'Send this to Daniel and decide together.' })
    expect(result.firstStep.title).toBe('Raise mortality coverage')
    expect(result.partner).toBe('Daniel')
  })

  it('reports a failed render as an error event with the step, and logs it', async () => {
    const broken: RenderVideo = async () => {
      throw new Error('Chrome crashed')
    }
    const { events, job, runsDir } = await run(emily, broken)
    expect(events.at(-1)).toEqual({ type: 'error', message: 'Rendering your video failed: Chrome crashed' })
    expect(job?.status).toBe('failed')
    const log = readFileSync(join(runsDir, 'daniel-emily-johnson', 'emily', '2026-11-18T16-05-03-123Z', 'log.txt'), 'utf8')
    expect(log).toContain('Chrome crashed')
  })

  it('fails at the brief step for a child, without creating a run folder', async () => {
    const { events, runsDir } = await run({ ...emily, member: 'oliver' })
    expect(events.at(-1)).toMatchObject({ type: 'error', message: expect.stringContaining('Reading your plan failed') })
    expect(existsSync(join(runsDir, 'daniel-emily-johnson'))).toBe(false)
  })
})
