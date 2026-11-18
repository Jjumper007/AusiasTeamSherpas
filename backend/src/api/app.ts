import express, { type ErrorRequestHandler, type Express } from 'express'
import { BriefError } from '../brief/errors'
import { DEMO_URL_PREFIX } from '../demo/demo-folder'
import { demoRoutes } from '../demo/demo-routes'
import { casesRoutes } from './cases-routes'
import { jobsRoutes, type JobsRoutesDeps } from './jobs-routes'

export interface AppDeps extends JobsRoutesDeps {
  /** Folder served under /runs: the MP4 and everything else each job wrote. */
  readonly runsDir: string
  /** Set in demo mode (DEMO=1): the folder of videos made earlier, served under /demo. No new videos are made. */
  readonly demoDir?: string
}

const MAX_BODY = '16kb'

const NOT_FOUND = 404
const CLIENT_ERRORS = { min: 400, max: 499 }

/** Express and its middlewares (static files, JSON body) mark their own errors with an HTTP status. */
const clientStatus = (error: unknown): number | undefined => {
  const status = (error as { status?: unknown } | null)?.status
  return typeof status === 'number' && status >= CLIENT_ERRORS.min && status <= CLIENT_ERRORS.max ? status : undefined
}

/** Unknown case or member, invalid survey: the message is written for the person using the app. */
const handleErrors: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof BriefError) {
    res.status(NOT_FOUND).json({ error: error.message })
    return
  }
  const status = clientStatus(error)
  if (status !== undefined) {
    res.status(status).json({ error: status === NOT_FOUND ? 'Not found' : 'Invalid request' })
    return
  }
  console.error(`[api] ${req.method} ${req.originalUrl}`, error)
  res.status(500).json({ error: 'Something went wrong on the server. Check the backend log.' })
}

const STATIC_OPTIONS = { fallthrough: false, dotfiles: 'ignore', index: false } as const

/** The Express app: /api for the web app, /runs for the outputs of each job, /demo for the demo videos. */
export const createApp = (deps: AppDeps): Express => {
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: MAX_BODY }))
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true })
  })
  app.use('/api', casesRoutes())
  app.use('/api', demoRoutes(deps.demoDir))
  app.use('/api', jobsRoutes(deps))
  app.use('/runs', express.static(deps.runsDir, STATIC_OPTIONS))
  if (deps.demoDir) app.use(DEMO_URL_PREFIX, express.static(deps.demoDir, STATIC_OPTIONS))
  app.use(handleErrors)
  return app
}
