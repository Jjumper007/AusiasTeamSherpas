import { Router } from 'express'
import { z } from 'zod'
import type { LiveSceneReport } from '../api/live-types'
import { formatSec, type LiveLog } from './live-log'
import { LIVE_SCENE_PARTS } from './live-scene-files'

/**
 * POST /api/live/jobs/:id/scene (#15): what the page did with a Claude scene, measured on the Player's
 * own clock, as a line of the run's log.txt. The swap lines are where a rehearsal reads the real margin:
 * `scene what_matters: swapped in at 0:27.1 of the video, 2.4 s before its part`.
 */

const MAX_REPORTED_SEC = 3600
const MAX_DETAIL_CHARS = 300
const SEC_PER_MINUTE = 60
const NO_CONTENT = 204

const SceneReportSchema = z.object({
  part: z.enum(LIVE_SCENE_PARTS as [string, ...string[]]),
  outcome: z.enum(['swapped', 'late', 'started', 'load-failed', 'threw']),
  videoSec: z.number().min(0).max(MAX_REPORTED_SEC),
  marginSec: z.number().min(-MAX_REPORTED_SEC).max(MAX_REPORTED_SEC),
  neededSec: z.number().min(0).max(MAX_REPORTED_SEC),
  detail: z.string().max(MAX_DETAIL_CHARS).optional(),
})

/** "0:27.1": a moment of the video as its controls show it. */
export const videoTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / SEC_PER_MINUTE)
  const rest = formatSec(seconds - minutes * SEC_PER_MINUTE)
  return `${minutes}:${rest.padStart('00.0'.length, '0')}`
}

/** On one line: a detail with line breaks must not forge lines of the log. */
const withDetail = (line: string, detail: string | undefined): string => (detail ? `${line} (${detail.replace(/\s+/g, ' ').trim()})` : line)

/** How the log says the page refused a Claude scene (`browser-verdicts.ts` reads these back for the MP4). */
export const LOAD_FAILED_TEXT = 'kept the Standard scene: the module failed to load'
export const THREW_TEXT = "Claude's scene threw while drawing"

/** "scene what_matters:": how every report line starts. */
export const sceneReportPrefix = (part: string): string => `scene ${part}:`

/** The log line of one report. */
export const sceneReportLine = ({ part, outcome, videoSec, marginSec, neededSec, detail }: LiveSceneReport): string => {
  const at = `at ${videoTime(videoSec)} of the video`
  const prefix = sceneReportPrefix(part)
  switch (outcome) {
    case 'swapped':
      return `${prefix} swapped in ${at}, ${formatSec(marginSec)} s before its part`
    case 'late':
      return `${prefix} kept the Standard scene: arrived ${at}, ${formatSec(marginSec)} s before its part (needs ${formatSec(neededSec)} s)`
    case 'started':
      return `${prefix} kept the Standard scene: arrived ${at}, ${formatSec(-marginSec)} s after its part started`
    case 'load-failed':
      return withDetail(`${prefix} ${LOAD_FAILED_TEXT} ${at}`, detail)
    case 'threw':
      return withDetail(`${prefix} ${THREW_TEXT} ${at}; back to the Standard scene`, detail)
  }
}

/** `onReport` also gets each valid report, e.g. for the background MP4 to leave out a scene the page refused (#17). */
export const sceneReportRoutes = (
  logOf: (jobId: string) => LiveLog | undefined,
  onReport?: (jobId: string, report: LiveSceneReport) => void,
): Router => {
  const routes = Router()
  routes.post('/api/live/jobs/:id/scene', (req, res) => {
    const log = logOf(req.params.id)
    if (!log) {
      res.status(404).json({ error: 'No such live run' })
      return
    }
    const report = SceneReportSchema.safeParse(req.body)
    if (!report.success) {
      res.status(400).json({ error: 'Invalid scene report' })
      return
    }
    log(sceneReportLine(report.data as LiveSceneReport))
    onReport?.(req.params.id, report.data as LiveSceneReport)
    res.status(NO_CONTENT).end()
  })
  return routes
}
