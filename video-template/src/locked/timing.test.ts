import { describe, expect, test } from 'vitest'
import { BRAND, outroFromFrame, sceneFrameRanges, totalFrames, videoFrames } from './timing'

const FPS = 30

describe('sceneFrameRanges', () => {
  test('places each scene right after the previous one', () => {
    const scenes = [{ durationSec: 8 }, { durationSec: 14 }, { durationSec: 2.5 }]

    const ranges = sceneFrameRanges(scenes, FPS)

    expect(ranges).toEqual([
      { from: 0, durationInFrames: 240 },
      { from: 240, durationInFrames: 420 },
      { from: 660, durationInFrames: 75 },
    ])
  })

  test('rounds a fractional duration to whole frames', () => {
    const ranges = sceneFrameRanges([{ durationSec: 1.016 }, { durationSec: 1 }], FPS)

    expect(ranges).toEqual([
      { from: 0, durationInFrames: 30 },
      { from: 30, durationInFrames: 30 },
    ])
  })

  test('never gives a scene zero frames', () => {
    const ranges = sceneFrameRanges([{ durationSec: 0.001 }], FPS)

    expect(ranges).toEqual([{ from: 0, durationInFrames: 1 }])
  })
})

describe('totalFrames', () => {
  test('adds up the frames of every scene', () => {
    const scenes = [{ durationSec: 8 }, { durationSec: 14 }, { durationSec: 2.5 }]

    expect(totalFrames(scenes, FPS)).toBe(735)
  })
})

describe('videoFrames', () => {
  test('adds the opening before the scenes and the closing over their last frames', () => {
    const scenes = [{ durationSec: 8 }, { durationSec: 14 }, { durationSec: 2.5 }]

    expect(outroFromFrame(scenes, FPS)).toBe(BRAND.contentFromFrame + 735 - BRAND.outroOverlapFrames)
    expect(videoFrames(scenes, FPS)).toBe(BRAND.contentFromFrame + 735 - BRAND.outroOverlapFrames + BRAND.outroFrames)
  })
})
