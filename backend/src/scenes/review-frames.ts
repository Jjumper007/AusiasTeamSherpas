import type { Part, VideoProps } from '@sherpas/shared'
import { planShots, type ShotCue } from '../../../video-template/src/locked/stage/camera'
import { BRAND, sceneFrameRanges, type FrameRange } from '../../../video-template/src/locked/timing'
import { FPS } from '../pipeline/video-timeline'

/**
 * The frames the visual review (#10) looks at. A frame taken while the camera moves, or during a
 * cutaway to the presenter, crops the wall screen and would show defects the scene code never had.
 * So each target scene gets frames only while the camera rests on the screen: one halfway through
 * the scene and one at its last resting moment, when every entrance should have played. Read from
 * the template's own camera plan, so the two can never drift apart.
 */

/** When in the scene a review frame sits. */
export type ReviewMoment = 'middle' | 'end'

export interface ReviewFrame {
  readonly part: Part
  readonly moment: ReviewMoment
  /** Frame of the whole MP4 (after the logo opening). */
  readonly frame: number
}

/** The camera takes 14 frames to move between shots (`CUT_FRAMES` in Video.tsx); a few more to settle. */
const SETTLE_FRAMES = 20
/** A resting stretch ends this far before the camera cuts away inside the scene. */
const CUT_MARGIN_FRAMES = 3
/**
 * A resting stretch that lasts to the end of the scene stops this far before it: clear of the
 * screen's exit swipe (`SWIPE_OUT_FRAMES` = 10 in Screen.tsx) and of the next chapter wipe, which
 * starts `HALF_WIPE_FRAMES` = 13 frames before the next scene (ChapterWipe.tsx).
 */
const SCENE_END_MARGIN_FRAMES = 18
const MIDDLE_SHARE = 0.5
/** Two frames closer than this show the same thing: keep only the end one. */
const MIN_GAP_FRAMES = 30

interface Window {
  readonly first: number
  readonly last: number
}

/** Stretches of a scene, in scene-clock frames, where the camera rests on the screen. */
export const screenWindows = (range: FrameRange, cues: readonly ShotCue[]): Window[] => {
  const end = range.from + range.durationInFrames
  return cues.flatMap((cue, index) => {
    if (cue.shot !== 'screen' || cue.atFrame < range.from || cue.atFrame >= end) return []
    const next = cues[index + 1]?.atFrame
    const last = next !== undefined && next < end ? next - 1 - CUT_MARGIN_FRAMES : end - 1 - SCENE_END_MARGIN_FRAMES
    const window = { first: cue.atFrame + SETTLE_FRAMES, last }
    return window.first <= window.last ? [window] : []
  })
}

const clampTo = (frame: number, window: Window): number => Math.min(window.last, Math.max(window.first, frame))

/** The resting frame closest to `target` (`windows` is never empty here). */
const nearestResting = (target: number, windows: readonly Window[]): number =>
  windows
    .map((window) => clampTo(target, window))
    .reduce((best, frame) => (Math.abs(frame - target) < Math.abs(best - target) ? frame : best))

/** No frame when the camera never rests on the screen: a moving or cut-away shot would mislead the review. */
const sceneReviewFrames = (part: Part, range: FrameRange, cues: readonly ShotCue[]): ReviewFrame[] => {
  const windows = screenWindows(range, cues)
  const lastWindow = windows.at(-1)
  if (!lastWindow) return []
  const middle = nearestResting(range.from + Math.round(range.durationInFrames * MIDDLE_SHARE), windows)
  const end = lastWindow.last
  const endFrame: ReviewFrame = { part, moment: 'end', frame: BRAND.contentFromFrame + end }
  if (end - middle < MIN_GAP_FRAMES) return [endFrame]
  return [{ part, moment: 'middle', frame: BRAND.contentFromFrame + middle }, endFrame]
}

/** The review frames of the `parts` Claude redesigned, in video order. */
export const reviewFrames = (props: VideoProps, parts: readonly Part[], fps = FPS): ReviewFrame[] => {
  const ranges = sceneFrameRanges(props.scenes, fps)
  const cues = planShots(ranges, fps)
  return props.script.scenes.flatMap((scene, index) =>
    parts.includes(scene.part) ? sceneReviewFrames(scene.part, ranges[index], cues) : [],
  )
}
