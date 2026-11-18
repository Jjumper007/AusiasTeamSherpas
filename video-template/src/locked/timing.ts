import type { SceneTiming } from '@sherpas/shared'

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
