/// <reference types="node" />
import { createApp } from './api/app'
import { createJobStore } from './jobs/job-store'
import { RUNS_DIR } from './paths'
import { renderWithRemotion } from './pipeline/render-video'
import { runJob } from './pipeline/run-job'

const DEFAULT_PORT = 3001

const parsePort = (value: string | undefined): number => {
  const port = Number(value ?? DEFAULT_PORT)
  if (!Number.isInteger(port) || port <= 0) throw new Error(`API_PORT must be a port number, got "${value}"`)
  return port
}

const port = parsePort(process.env.API_PORT)
const store = createJobStore()
const deps = { store, renderVideo: renderWithRemotion, runsDir: RUNS_DIR, now: () => new Date() }
const app = createApp({ store, runsDir: RUNS_DIR, startJob: (job) => void runJob(job, deps) })

app.listen(port, () => {
  console.log(`Sherpas API on http://localhost:${port} (outputs in ${RUNS_DIR})`)
})
