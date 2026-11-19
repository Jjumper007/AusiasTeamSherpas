import { Router } from 'express'
import { z } from 'zod'
import { LIVE_RUN_PLAYING, type LiveJobEvent } from '../api/live-types'
import type { Job } from '../jobs/job-store'
import { createBrowserVerdicts, type BrowserVerdictsRecorder } from './browser-verdicts'
import { formatSec, type LiveLog } from './live-log'
import { runLiveJob, type LiveDeps } from './run-live'
import { sceneReportRoutes } from './scene-report-routes'

/**
 * Only one Live run at a time (docs/specs/live-run.md, "API contract"): a run holds the slot from
 * `POST /api/jobs` until its work is done (`live-ready`, `page`, any `scene` events and, with `mp4`, the
 * background MP4's render, #17) or it fails. The SSE stream is the session: when no page has it open for
 * `pageGoneGraceMs` (time for EventSource to reconnect after a blip), the run is told to stop (which
 * cancels its MP4) and the slot is freed. Also takes the browser's reports of the video's first frame and
 * of what it did with each Claude scene (#15), for the run's log and for the MP4.
 */

export interface LiveJobs {
  /** For `createApp`: starts a Live run in the background and takes the slot. */
  readonly startJob: (job: Job<LiveJobEvent>) => void
  /** For `createApp`: the 409 message while a Live run holds the slot. */
  readonly conflict: () => string | undefined
  /** For `createApp`: a page opened or closed a run's stream. */
  readonly onStreamOpened: (job: Job<LiveJobEvent>) => void
  readonly onStreamClosed: (job: Job<LiveJobEvent>) => void
  /** POST /api/live/jobs/:id/first-frame and POST /api/live/jobs/:id/scene. */
  readonly routes: Router
  /** The run holding the slot, if any: resolves when it frees it. For tests. */
  readonly current: () => Promise<void> | undefined
}

export interface LiveJobsOptions {
  /** How long a run may have no open stream before it counts as abandoned. */
  readonly pageGoneGraceMs?: number
}

/** EventSource reconnects after ~3 s by default: a blip shorter than this does not stop the run. */
export const PAGE_GONE_GRACE_MS = 5000
/** The first-frame report of an older run is still logged, up to this many runs back. */
const REMEMBERED_RUNS = 20
const MAX_REPORTED_SEC = 3600
const NO_CONTENT = 204

const FirstFrameSchema = z.object({
  browserSec: z.number().min(0).max(MAX_REPORTED_SEC),
  sinceReadySec: z.number().min(0).max(MAX_REPORTED_SEC).optional(),
  afterTap: z.boolean().default(false),
})

const firstFrameLine = ({ browserSec, sinceReadySec, afterTap }: z.infer<typeof FirstFrameSchema>): string =>
  [
    `first frame (browser: ${formatSec(browserSec)} s after submit`,
    sinceReadySec === undefined ? '' : `, ${formatSec(sinceReadySec)} s after live-ready`,
    afterTap ? ', after a tap' : '',
    ')',
  ].join('')

/** POST /api/live/jobs/:id/first-frame: writes the browser's report to that run's log. */
const firstFrameRoutes = (logOf: (jobId: string) => LiveLog | undefined): Router => {
  const routes = Router()
  routes.post('/api/live/jobs/:id/first-frame', (req, res) => {
    const log = logOf(req.params.id)
    if (!log) {
      res.status(404).json({ error: 'No such live run' })
      return
    }
    const report = FirstFrameSchema.safeParse(req.body)
    if (!report.success) {
      res.status(400).json({ error: 'Invalid first-frame report' })
      return
    }
    log(firstFrameLine(report.data))
    res.status(NO_CONTENT).end()
  })
  return routes
}

interface Playing {
  readonly jobId: string
  readonly controller: AbortController
  /** What the page did with each Claude scene, for the MP4. */
  readonly browser: BrowserVerdictsRecorder
  readonly work: Promise<void>
  /** Streams of this run open right now. */
  readonly streams: number
  readonly graceTimer?: ReturnType<typeof setTimeout>
}

export const createLiveJobs = (deps: LiveDeps, options: LiveJobsOptions = {}): LiveJobs => {
  const graceMs = options.pageGoneGraceMs ?? PAGE_GONE_GRACE_MS
  let playing: Playing | undefined
  let logs: ReadonlyArray<readonly [jobId: string, log: LiveLog]> = []

  const remember = (jobId: string, log: LiveLog): void => {
    logs = [...logs, [jobId, log] as const].slice(-REMEMBERED_RUNS)
  }
  const logOf = (jobId: string): LiveLog | undefined => logs.find(([id]) => id === jobId)?.[1]
  /** Only the run holding the slot still uses the page's reports: a finished run's MP4 is done. */
  const verdictsOf = (jobId: string): BrowserVerdictsRecorder | undefined => (playing?.jobId === jobId ? playing.browser : undefined)

  const release = (jobId: string): void => {
    if (playing?.jobId !== jobId) return
    clearTimeout(playing.graceTimer)
    playing = undefined
  }

  const startJob = (job: Job<LiveJobEvent>): void => {
    const controller = new AbortController()
    const browser = createBrowserVerdicts()
    const work = runLiveJob(job, deps, { signal: controller.signal, onLog: (log) => remember(job.id, log), browser })
      .catch((error: unknown) => console.error(`[live job ${job.id}] unexpected failure`, error))
      .finally(() => release(job.id))
    playing = { jobId: job.id, controller, browser, work, streams: 0 }
  }

  /** Counts the run's open streams; with none left for `graceMs`, the page is gone. */
  const streamsChanged = (job: Job<LiveJobEvent>, change: 1 | -1): void => {
    if (playing?.jobId !== job.id) return
    clearTimeout(playing.graceTimer)
    const streams = Math.max(0, playing.streams + change)
    const { controller } = playing
    const graceTimer = streams === 0 ? setTimeout(() => controller.abort(), graceMs) : undefined
    playing = { ...playing, streams, graceTimer }
  }

  return {
    startJob,
    conflict: () => (playing ? LIVE_RUN_PLAYING : undefined),
    onStreamOpened: (job) => streamsChanged(job, 1),
    onStreamClosed: (job) => streamsChanged(job, -1),
    routes: Router().use(
      firstFrameRoutes(logOf),
      sceneReportRoutes(logOf, (jobId, report) => verdictsOf(jobId)?.record(report)),
    ),
    current: () => playing?.work,
  }
}
