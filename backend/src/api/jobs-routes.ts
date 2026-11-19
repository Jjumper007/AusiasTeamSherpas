import { Router, type Response } from 'express'
import { validateNarration } from '@sherpas/shared'
import { z } from 'zod'
import { loadCase } from '../brief/case-loader'
import { isFinalEvent, type Job, type JobStore, type StoreEvent } from '../jobs/job-store'
import { findAdult } from '../survey/members'
import { SurveyAnswersSchema } from '../survey/resolve-survey'
import type { JobEvent, JobRequest } from './types'

/** More jobs than this at once are refused: each one renders a video in Chrome. */
export const MAX_RUNNING_JOBS = 3
const MAX_ID_LENGTH = 64
const CONFLICT = 409

/** The nickname is said in the video, so it may not carry a figure the plan doesn't have ("Dan 4500000"). */
const AnswersSchema = SurveyAnswersSchema.refine(
  (answers) => answers.nickname === undefined || validateNarration(answers.nickname, {}).ok,
  { message: 'The name cannot contain long numbers', path: ['nickname'] },
)

const JobRequestSchema = z.object({
  caseId: z.string().min(1).max(MAX_ID_LENGTH),
  member: z.string().min(1).max(MAX_ID_LENGTH),
  answers: AnswersSchema.default({}),
})

export interface JobsRoutesDeps<E extends StoreEvent = JobEvent> {
  readonly store: JobStore<E>
  /** Starts the pipeline in the background. Must not throw. */
  readonly startJob: (job: Job<E>) => void
  /** The live server only: why a new job cannot start now (answered as 409), or undefined when it can. */
  readonly conflict?: () => string | undefined
  /** The live server only: a page opened a running job's SSE stream. */
  readonly onStreamOpened?: (job: Job<E>) => void
  /** The live server only: a running job's SSE stream closed, whether it ended or the page went away. */
  readonly onStreamClosed?: (job: Job<E>) => void
}

const describe = (error: z.ZodError): string =>
  error.issues.map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`).join('; ')

const writeEvent = (res: Response, event: StoreEvent): void => {
  res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)
}

/** POST /jobs answers at once with the job id; GET /jobs/:id/events streams its progress (SSE). */
export const jobsRoutes = <E extends StoreEvent>({
  store,
  startJob,
  conflict,
  onStreamOpened,
  onStreamClosed,
}: JobsRoutesDeps<E>): Router => {
  const router = Router()

  router.post('/jobs', (req, res) => {
    const parsed = JobRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: describe(parsed.error) })
      return
    }
    // Unknown case or member: a clear 4xx now rather than a failed job later.
    findAdult(loadCase(parsed.data.caseId), parsed.data.member)
    const busy = conflict?.()
    if (busy !== undefined) {
      res.status(CONFLICT).json({ error: busy })
      return
    }
    if (store.runningCount() >= MAX_RUNNING_JOBS) {
      res.status(429).json({ error: 'Too many videos are being made right now. Try again in a minute.' })
      return
    }
    const request: JobRequest = parsed.data
    const job = store.create(request)
    startJob(job)
    res.status(202).json({ id: job.id })
  })

  router.get('/jobs/:id', (req, res) => {
    const job = store.get(req.params.id)
    if (!job) {
      res.status(404).json({ error: 'No such job' })
      return
    }
    res.json({ id: job.id, status: job.status, result: job.result ?? null })
  })

  router.get('/jobs/:id/events', (req, res) => {
    const job = store.get(req.params.id)
    if (!job) {
      res.status(404).json({ error: 'No such job' })
      return
    }
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' })
    // Send the headers now: without a first write, a job with no events yet would leave the browser waiting.
    res.flushHeaders()
    job.events.forEach((event) => writeEvent(res, event))
    if (job.status !== 'running') {
      res.end()
      return
    }
    onStreamOpened?.(job)
    const stop = store.subscribe(job.id, (event) => {
      writeEvent(res, event)
      if (isFinalEvent(event)) res.end()
    })
    res.on('close', () => {
      stop()
      onStreamClosed?.(job)
    })
  })

  return router
}
