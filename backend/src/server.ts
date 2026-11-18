/// <reference types="node" />
import { createApp } from './api/app'
import { loadEnvFile } from './env'
import { createJobStore, type Job, type JobStore } from './jobs/job-store'
import { demoDir, RUNS_DIR, SPEECH_CACHE_DIR } from './paths'
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

/** The full pipeline: script and scenes by Claude, voice by ElevenLabs, render by Remotion. */
const pipelineStarter = (store: JobStore, port: number): ((job: Job) => void) => {
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
  return (job) => void runJob(job, deps)
}

/** The demo never makes a video; `POST /api/jobs` is refused before it gets here. */
const refuseJob = (job: Job): void => {
  throw new Error(`Job ${job.id} reached the pipeline in demo mode`)
}

loadEnvFile()
const port = parsePort(process.env.API_PORT)
const store = createJobStore()
/** Demo mode (DEMO=1, `npm run demo`): plays the videos in the demo folder and never calls Claude or ElevenLabs. */
const demo = process.env.DEMO === '1' ? demoDir() : undefined
const startJob = demo ? refuseJob : pipelineStarter(store, port)
const app = createApp({ store, runsDir: RUNS_DIR, demoDir: demo, startJob })

app.listen(port, () => {
  console.log(`Sherpas API on http://localhost:${port} (outputs in ${RUNS_DIR})`)
  if (demo) console.log(`Demo mode: playing the videos in ${demo}; no new videos are made`)
})
