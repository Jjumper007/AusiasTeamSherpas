/// <reference types="node" />
import { join } from 'node:path'
import type { LiveJobEvent } from './api/live-types'
import { createApp } from './api/app'
import { loadEnvFile } from './env'
import { createJobStore } from './jobs/job-store'
import { createLiveJobs } from './live/live-jobs'
import { liveDemoRoutes } from './live/live-demo'
import { liveRoutes } from './live/live-routes'
import { demoDir, RUNS_DIR, SPEECH_CACHE_DIR, VIDEO_TEMPLATE_DIR } from './paths'
import { bundleTemplate, renderWithRemotion } from './pipeline/render-video'
import { parsePort } from './port'
import { runClaudeCli } from './script/claude-cli'
import { createSceneRecorder } from './voice/narrate'

/**
 * The live server (`npm run live`): the same case and survey routes as `server.ts`, but `POST /api/jobs`
 * starts a Live run (live/run-live.ts), one at a time. Plus what the Live run's player needs: compiled
 * scene modules and the template's music and effects.
 */

loadEnvFile()
const port = parsePort(process.env.API_PORT)
const store = createJobStore<LiveJobEvent>()
const live = createLiveJobs({
  store,
  runClaude: runClaudeCli,
  // The narration URLs point at this server, which serves the run folders under /runs (the MP4 render needs them).
  recordScene: createSceneRecorder({ env: process.env, cacheDir: SPEECH_CACHE_DIR, runsUrl: `http://localhost:${port}/runs` }),
  runsDir: RUNS_DIR,
  now: () => new Date(),
  // Claude designs parts 3–5 while the video plays (#15).
  scenes: { runClaude: runClaudeCli },
  // Then the MP4 renders in the background, kept only if the page is still open when it ends (#17).
  mp4: { renderVideo: renderWithRemotion, bundle: bundleTemplate },
})
const app = createApp({
  store,
  runsDir: RUNS_DIR,
  startJob: live.startJob,
  conflict: live.conflict,
  onStreamOpened: live.onStreamOpened,
  onStreamClosed: live.onStreamClosed,
  extraRoutes: [live.routes, liveRoutes({ runsDir: RUNS_DIR, templatePublicDir: join(VIDEO_TEMPLATE_DIR, 'public') }), liveDemoRoutes({ demoDir: demoDir() })],
})

app.listen(port, () => {
  console.log(`Sherpas live API on http://localhost:${port} (outputs in ${RUNS_DIR})`)
})
