import type { Part, SceneTiming } from '@sherpas/shared'
import { cuesForScene } from '../captions'
import type { FrameRange } from '../timing'

/**
 * LOCKED. What the presenter is saying at any moment, built from the caption cues of every
 * scene. It drives the presenter's gestures, face and mouth.
 */
export type AdvisorPose = 'idle' | 'point' | 'present' | 'explain' | 'welcome' | 'thumbsUp' | 'think' | 'count'
export type AdvisorExpr = 'happy' | 'neutral' | 'concerned'

export interface SpokenLine {
  readonly sceneIndex: number
  readonly startSec: number
  readonly endSec: number
  readonly pose: AdvisorPose
  readonly expr: AdvisorExpr
}

/** Gestures per part of the arc, one per caption cue, repeated in order. */
const POSES: Readonly<Record<Part, readonly AdvisorPose[]>> = {
  hook: ['welcome', 'present'],
  where_you_are: ['explain', 'point', 'present'],
  what_matters: ['point', 'count', 'explain', 'point'],
  first_step: ['present', 'point', 'count'],
  what_changes: ['thumbsUp', 'point', 'welcome'],
}

const EXPRESSIONS: Readonly<Record<Part, AdvisorExpr>> = {
  hook: 'happy',
  where_you_are: 'neutral',
  what_matters: 'neutral',
  first_step: 'happy',
  what_changes: 'happy',
}

/** Gestures start slightly before the words, as a speaker does. */
const GESTURE_LEAD_SEC = 0.15

export interface SceneSpeech {
  readonly part: Part
  readonly narration: string
  readonly timing: SceneTiming
  readonly range: FrameRange
}

/** Every caption cue of the video on one timeline, in seconds from the start of the video. */
export const speechTimeline = (scenes: readonly SceneSpeech[], fps: number): SpokenLine[] =>
  scenes.flatMap(({ part, narration, timing, range }, sceneIndex) => {
    const sceneStart = range.from / fps
    const sceneEnd = sceneStart + range.durationInFrames / fps
    const poses = POSES[part]
    return cuesForScene(narration, timing).map((cue, cueIndex) => ({
      sceneIndex,
      startSec: sceneStart + cue.startSec,
      endSec: Math.min(sceneEnd, sceneStart + cue.endSec),
      pose: poses[cueIndex % poses.length],
      expr: EXPRESSIONS[part],
    }))
  })

/** The line the presenter is on at `timeSec` (held until the next one starts), or -1 before the first. */
export const lineIndexAt = (lines: readonly SpokenLine[], timeSec: number): number =>
  lines.reduce((found, line, index) => (timeSec >= line.startSec - GESTURE_LEAD_SEC ? index : found), -1)
