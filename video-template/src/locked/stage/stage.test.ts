import { describe, expect, it } from 'vitest'
import { sceneFrameRanges } from '../timing'
import { planShots, shotIndexAt } from './camera'
import { lineIndexAt, speechTimeline } from './speech'

const FPS = 30

describe('planShots', () => {
  it('opens the hook on the presenter and pulls back to the office', () => {
    // Arrange
    const ranges = sceneFrameRanges([{ durationSec: 8 }], FPS)

    // Act
    const shots = planShots(ranges, FPS)

    // Assert
    expect(shots).toEqual([
      { atFrame: 0, shot: 'close' },
      { atFrame: 108, shot: 'wide' },
    ])
  })

  it('moves to the screen after each wipe and cuts away during long scenes', () => {
    const ranges = sceneFrameRanges([{ durationSec: 8 }, { durationSec: 25 }, { durationSec: 6 }], FPS)

    const shots = planShots(ranges, FPS)
    const secondScene = shots.filter((cue) => cue.atFrame >= 240 && cue.atFrame < 990)

    expect(secondScene.map((cue) => cue.shot)).toEqual(['wide', 'screen', 'close', 'screen', 'wide', 'screen'])
    expect(secondScene.at(-1)?.atFrame).toBeLessThanOrEqual(990)
  })

  it('cuts nothing away in a short scene', () => {
    const ranges = sceneFrameRanges([{ durationSec: 8 }, { durationSec: 9 }, { durationSec: 6 }], FPS)

    const shots = planShots(ranges, FPS).filter((cue) => cue.atFrame >= 240 && cue.atFrame < 510)

    expect(shots.map((cue) => cue.shot)).toEqual(['wide', 'screen'])
  })

  it('ends the last scene on the wide shot', () => {
    const ranges = sceneFrameRanges([{ durationSec: 8 }, { durationSec: 12 }], FPS)

    const shots = planShots(ranges, FPS)

    expect(shots.at(-1)).toEqual({ atFrame: 600 - 75, shot: 'wide' })
  })

  it('keeps cuts in time order', () => {
    const ranges = sceneFrameRanges(
      [{ durationSec: 7 }, { durationSec: 21 }, { durationSec: 25 }, { durationSec: 11 }, { durationSec: 12 }],
      FPS,
    )

    const frames = planShots(ranges, FPS).map((cue) => cue.atFrame)

    expect(frames).toEqual([...frames].sort((a, b) => a - b))
  })
})

describe('shotIndexAt', () => {
  it('returns the last cut that has started', () => {
    const cues = [
      { atFrame: 0, shot: 'close' as const },
      { atFrame: 100, shot: 'wide' as const },
    ]

    expect(shotIndexAt(cues, 99)).toBe(0)
    expect(shotIndexAt(cues, 100)).toBe(1)
  })
})

describe('speechTimeline', () => {
  const timings = [
    {
      durationSec: 4,
      captions: [
        { text: 'Hi Dan.', startSec: 0.5, endSec: 2 },
        { text: 'Here we go.', startSec: 2, endSec: 3.5 },
      ],
    },
    { durationSec: 6, captions: [{ text: 'Your score.', startSec: 0.2, endSec: 9 }] },
  ]
  const ranges = sceneFrameRanges(timings, FPS)
  const lines = speechTimeline(
    [
      { part: 'hook', narration: 'Hi Dan. Here we go.', timing: timings[0], range: ranges[0] },
      { part: 'where_you_are', narration: 'Your score.', timing: timings[1], range: ranges[1] },
    ],
    FPS,
  )

  it('places every cue on the video timeline with a gesture for its part', () => {
    expect(lines).toEqual([
      { sceneIndex: 0, startSec: 0.5, endSec: 2, pose: 'welcome', expr: 'happy' },
      { sceneIndex: 0, startSec: 2, endSec: 3.5, pose: 'present', expr: 'happy' },
      { sceneIndex: 1, startSec: 4.2, endSec: 10, pose: 'explain', expr: 'neutral' },
    ])
  })

  it('finds the current line, starting the gesture just before the words', () => {
    expect(lineIndexAt(lines, 0.2)).toBe(-1)
    expect(lineIndexAt(lines, 0.4)).toBe(0)
    expect(lineIndexAt(lines, 3.9)).toBe(1)
    expect(lineIndexAt(lines, 4.1)).toBe(2)
  })
})
