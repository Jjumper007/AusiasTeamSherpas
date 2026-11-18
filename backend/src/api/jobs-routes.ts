import { Router, type Response } from 'express'
import { validateNarration } from '@sherpas/shared'
import { z } from 'zod'
import { loadCase } from '../brief/case-loader'
import type { Job, JobStore } from '../jobs/job-store'
import { findAdult } from '../survey/members'
import { SurveyAnswersSchema } from '../survey/resolve-survey'
import type { JobEvent, JobRequest } from './types'

/** More jobs than this at once are refused: each one renders a video in Chrome. */
export const MAX_RUNNING_JOBS = 3
const MAX_ID_LENGTH = 64

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

export interface JobsRoutesDeps {
  readonly store: JobStore
  /** Starts the pipeline in the background. Must not throw. */
  readonly startJob: (job: Job) => void
}

const describe = (error: z.ZodError): string =>
  error.issues.map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`).join('; ')

const writeEvent = (res: Response, event: JobEvent): void => {
  res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)
}

const isLast = (event: JobEvent): boolean => event.type === 'done' || event.type === 'error'

/** POST /jobs answers at once with the job id; GET /jobs/:id/events streams its progress (SSE). */
export const jobsRoutes = ({ store, startJob }: JobsRoutesDeps): Router => {
  const router = Router()

  router.post('/jobs', (req, res) => {
    const parsed = JobRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: describe(parsed.error) })
      return
    }
    // Unknown case or member: a clear 4xx now rather than a failed job later.
    findAdult(loadCase(parsed.data.caseId), parsed.data.member)
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
    const stop = store.subscribe(job.id, (event) => {
      writeEvent(res, event)
      if (isLast(event)) res.end()
    })
    res.on('close', stop)
  })

  return router
}
