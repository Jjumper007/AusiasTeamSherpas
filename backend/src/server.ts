/// <reference types="node" />
import { createApp } from './api/app'
import { loadEnvFile } from './env'
import { createJobStore } from './jobs/job-store'
import { RUNS_DIR, SPEECH_CACHE_DIR } from './paths'
import { renderCheckFrames, renderWithRemotion } from './pipeline/render-video'
import { runJob } from './pipeline/run-job'
import { createScenesWriter } from './scenes/write-scenes'
import { runClaudeCli } from './script/claude-cli'
import { createNarrator } from './voice/narrate'

const DEFAULT_PORT = 3001

const parsePort = (value: string | undefined): number => {
  const port = Number(value ?? DEFAULT_PORT)
  if (!Number.isInteger(port) || port <= 0) throw new Error(`API_PORT must be a port number, got "${value}"`)
  return port
}

loadEnvFile()
const port = parsePort(process.env.API_PORT)
const store = createJobStore()
/** The render fetches each scene's audio from this server, which serves the run folders under /runs. */
const narrate = createNarrator({
  env: process.env,
  cacheDir: SPEECH_CACHE_DIR,
  runsUrl: `http://localhost:${port}/runs`,
})
const deps = {
  store,
  narrate,
  renderVideo: renderWithRemotion,
  runClaude: runClaudeCli,
  writeScenes: createScenesWriter({ runClaude: runClaudeCli, checkFrames: renderCheckFrames }),
  runsDir: RUNS_DIR,
  now: () => new Date(),
}
const app = createApp({ store, runsDir: RUNS_DIR, startJob: (job) => void runJob(job, deps) })

app.listen(port, () => {
  console.log(`Sherpas API on http://localhost:${port} (outputs in ${RUNS_DIR})`)
})
