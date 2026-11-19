/// <reference types="node" />
import { createApp } from './api/app'
import { loadEnvFile } from './env'
import { createJobStore, type Job, type JobStore } from './jobs/job-store'
import { RUNS_DIR, SPEECH_CACHE_DIR } from './paths'
import { renderCheckFrames, renderWithRemotion } from './pipeline/render-video'
import { runJob } from './pipeline/run-job'
import { createScenesWriter } from './scenes/write-scenes'
import { runClaudeCli } from './script/claude-cli'
import { parsePort } from './port'
import { createNarrator } from './voice/narrate'

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

loadEnvFile()
const port = parsePort(process.env.API_PORT)
const store = createJobStore()
const app = createApp({ store, runsDir: RUNS_DIR, startJob: pipelineStarter(store, port) })

app.listen(port, () => {
  console.log(`Sherpas API on http://localhost:${port} (outputs in ${RUNS_DIR})`)
})
