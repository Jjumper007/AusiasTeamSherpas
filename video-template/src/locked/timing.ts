import type { SceneTiming } from '@sherpas/shared'
import type { Burst } from '../scenes/bursts'

const MIN_SCENE_FRAMES = 1

export interface FrameRange {
  readonly from: number
  readonly durationInFrames: number
}

const framesFor = (timing: SceneTiming, fps: number): number =>
  Math.max(MIN_SCENE_FRAMES, Math.round(timing.durationSec * fps))

/** Where each scene starts and how long it lasts, in frames. Scene durations come from the props, never from code. */
export const sceneFrameRanges = (scenes: readonly SceneTiming[], fps: number): FrameRange[] =>
  scenes.reduce<FrameRange[]>((ranges, timing) => {
    const previous = ranges.at(-1)
    const from = previous ? previous.from + previous.durationInFrames : 0
    return [...ranges, { from, durationInFrames: framesFor(timing, fps) }]
  }, [])

export const totalFrames = (scenes: readonly SceneTiming[], fps: number): number =>
  sceneFrameRanges(scenes, fps).reduce((total, range) => total + range.durationInFrames, 0)

/**
 * The brand opening and closing of the base video (Video 4.0), in frames at the video's 30 fps.
 * The opening shows the logo and opens an iris onto the first scene; the closing irises onto the
 * logo while the last scene ends, and holds it to the last frame.
 */
export const BRAND = {
  /** Length of the opening. */
  introFrames: 90,
  /** The iris starts opening onto the video here… */
  irisOpenFrame: 58,
  /** …and the five scenes start here, under the opening iris. */
  contentFromFrame: 66,
  /** Length of the closing. */
  outroFrames: 135,
  /** The closing iris starts this many frames before the last scene ends. */
  outroOverlapFrames: 24,
} as const

/** Where the closing starts: over the last frames of the five scenes. */
export const outroFromFrame = (scenes: readonly SceneTiming[], fps: number): number =>
  BRAND.contentFromFrame + totalFrames(scenes, fps) - BRAND.outroOverlapFrames

/** Length of the whole video: opening, the five scenes and the closing. */
export const videoFrames = (scenes: readonly SceneTiming[], fps: number): number =>
  outroFromFrame(scenes, fps) + BRAND.outroFrames

/** Frame at which a callout pops, from its scene and its share of the scene. */
export const burstStartFrame = (burst: Pick<Burst, 'atShare'>, range: FrameRange): number =>
  range.from + Math.round(range.durationInFrames * burst.atShare)
