import { describe, expect, test } from 'vitest'
import { musicVolume, MUSIC_LEVEL, soundCues } from './sound'
import { BRAND } from './timing'

const FPS = 30
const ranges = [
  { from: 0, durationInFrames: 240 },
  { from: 240, durationInFrames: 600 },
]
const timeline = {
  fps: FPS,
  ranges,
  shots: [
    { atFrame: 0, shot: 'close' as const },
    { atFrame: 100, shot: 'wide' as const },
    { atFrame: 150, shot: 'wide' as const },
    { atFrame: 300, shot: 'screen' as const },
  ],
  callouts: [
    { startFrame: 400, good: true },
    { startFrame: 500, good: false },
  ],
  outroFromFrame: 1000,
}

describe('soundCues', () => {
  test('places every cue in frames of the whole video, in order', () => {
    const cues = soundCues(timeline)

    expect(cues.map((cue) => cue.atFrame)).toEqual([...cues.map((cue) => cue.atFrame)].sort((a, b) => a - b))
    expect(cues.at(-1)).toEqual({ atFrame: 1058, sfx: 'ding', volume: 0.5 })
  })

  test('whips only on cuts that change the shot, just before them', () => {
    const whips = soundCues({ ...timeline, callouts: [] }).filter((cue) => cue.sfx === 'whip')

    expect(whips.map((cue) => cue.atFrame)).toEqual([
      BRAND.irisOpenFrame,
      BRAND.contentFromFrame + 100 - 2,
      BRAND.contentFromFrame + 300 - 2,
    ])
  })

  test('dings on good news and whips on bad news', () => {
    const cues = soundCues(timeline)

    expect(cues).toContainEqual({ atFrame: BRAND.contentFromFrame + 400, sfx: 'ding', volume: 0.45 })
    expect(cues).toContainEqual({ atFrame: BRAND.contentFromFrame + 500, sfx: 'whip', volume: 0.4 })
  })

  test('whooshes before every chapter wipe but the first scene', () => {
    const wipes = soundCues(timeline).filter((cue) => cue.sfx === 'whoosh' && cue.volume === 0.5)

    expect(wipes.map((cue) => cue.atFrame)).toEqual([BRAND.contentFromFrame + 240 - 14])
  })
})

describe('musicVolume', () => {
  const total = 1135

  test('starts silent and ends silent', () => {
    expect(musicVolume(0, total, 1000)).toBe(0)
    expect(musicVolume(total, total, 1000)).toBe(0)
  })

  test('plays at full level under the logo and dips under the narration', () => {
    expect(musicVolume(BRAND.contentFromFrame - 1, total, 1000)).toBeCloseTo(MUSIC_LEVEL.full)
    expect(musicVolume(500, total, 1000)).toBeCloseTo(MUSIC_LEVEL.underVoice)
    expect(musicVolume(1030, total, 1000)).toBeCloseTo(MUSIC_LEVEL.full)
  })
})
