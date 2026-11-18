import { videoPropsFixture, type VideoProps } from '@sherpas/shared'
import { describe, expect, it } from 'vitest'
import { planShots, shotIndexAt } from '../../../video-template/src/locked/stage/camera'
import { BRAND, sceneFrameRanges } from '../../../video-template/src/locked/timing'
import { FPS } from '../pipeline/video-timeline'
import { reviewFrames, screenWindows } from './review-frames'

/** Frames the camera needs to move between shots (`CUT_FRAMES` in Video.tsx). */
const CAMERA_MOVE_FRAMES = 14
/** The next chapter wipe starts 13 frames before a scene ends (ChapterWipe.tsx); the exit swipe takes 10 (Screen.tsx). */
const WIPE_AND_SWIPE_FRAMES = 13

const withDurations = (durations: readonly number[]): VideoProps => ({
  ...videoPropsFixture,
  scenes: videoPropsFixture.scenes.map((scene, index) => ({ ...scene, durationSec: durations[index] })) as VideoProps['scenes'],
})

const props = withDurations([7, 16, 18, 13, 15])
const ranges = sceneFrameRanges(props.scenes, FPS)
const cues = planShots(ranges, FPS)

describe('reviewFrames', () => {
  const frames = reviewFrames(props, ['what_matters', 'what_changes'])

  it('gives the middle and the end of each target scene, in video order', () => {
    expect(frames.map(({ part, moment }) => `${part}:${moment}`)).toEqual([
      'what_matters:middle',
      'what_matters:end',
      'what_changes:middle',
      'what_changes:end',
    ])
    expect(frames.map((frame) => frame.frame)).toEqual([...frames.map((frame) => frame.frame)].sort((a, b) => a - b))
  })

  it('only picks frames where the camera rests on the screen, inside the scene', () => {
    frames.forEach(({ part, frame }) => {
      const sceneFrame = frame - BRAND.contentFromFrame
      const range = ranges[props.script.scenes.findIndex((scene) => scene.part === part)]
      const cue = cues[shotIndexAt(cues, sceneFrame)]
      expect(cue.shot).toBe('screen')
      expect(sceneFrame - cue.atFrame).toBeGreaterThan(CAMERA_MOVE_FRAMES)
      expect(sceneFrame).toBeGreaterThanOrEqual(range.from)
      expect(sceneFrame).toBeLessThan(range.from + range.durationInFrames - WIPE_AND_SWIPE_FRAMES)
    })
  })

  it('leaves out the parts Claude did not redesign', () => {
    expect(reviewFrames(props, ['first_step']).every((frame) => frame.part === 'first_step')).toBe(true)
    expect(reviewFrames(props, [])).toEqual([])
  })

  it('keeps one frame when the scene is too short for two different ones', () => {
    const short = reviewFrames(withDurations([7, 16, 3, 13, 15]), ['what_matters'])
    expect(short.map((frame) => frame.moment)).toEqual(['end'])
  })

  it('gives no frame for a scene where the camera never rests on the screen', () => {
    expect(reviewFrames(withDurations([7, 16, 1, 13, 15]), ['what_matters'])).toEqual([])
  })
})

describe('screenWindows', () => {
  it('has no window in a scene where the camera never settles on the screen', () => {
    expect(screenWindows({ from: 0, durationInFrames: 30 }, [{ atFrame: 0, shot: 'wide' }, { atFrame: 24, shot: 'screen' }])).toEqual([])
  })
})
