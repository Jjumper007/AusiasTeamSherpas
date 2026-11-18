import { describe, expect, it } from 'vitest'
import { MAX_HOOK_SEC, MIN_VIDEO_SEC } from '../script/scene-timing'
import { durationWarnings, MAX_VIDEO_SEC, sceneDurations, VOICE_PAUSE_SEC } from './scene-durations'

const total = (durations: readonly number[]): number => durations.reduce((sum, seconds) => sum + seconds, 0)

describe('sceneDurations', () => {
  it('gives each scene its audio plus a short pause, rounded up to a tenth', () => {
    const durations = sceneDurations([5.03, 15, 20, 12, 10])
    expect(durations).toEqual([5.6, 15 + VOICE_PAUSE_SEC, 20 + VOICE_PAUSE_SEC, 12 + VOICE_PAUSE_SEC, 10 + VOICE_PAUSE_SEC])
  })

  it('drops the hook pause to keep the hook within the limit, but never cuts its voice', () => {
    expect(sceneDurations([7.8, 20, 20, 20, 20])[0]).toBe(MAX_HOOK_SEC)
    expect(sceneDurations([9.12, 20, 20, 20, 20])[0]).toBe(9.2)
  })

  it('pads the scenes after the hook evenly when the video would be shorter than the minimum', () => {
    const durations = sceneDurations([5, 10, 10, 10, 10])
    expect(durations[0]).toBe(5 + VOICE_PAUSE_SEC)
    expect(total(durations)).toBeGreaterThanOrEqual(MIN_VIDEO_SEC)
    expect(total(durations)).toBeLessThan(MIN_VIDEO_SEC + 0.5)
    expect(new Set(durations.slice(1)).size).toBe(1)
  })

  it('never makes a scene shorter than its audio', () => {
    const audio = [6.01, 14.07, 22.33, 9.99, 11.5]
    expect(sceneDurations(audio).every((seconds, index) => seconds >= audio[index])).toBe(true)
  })
})

describe('durationWarnings', () => {
  it('warns when the hook or the whole video runs too long', () => {
    expect(durationWarnings([6, 20, 20, 20, 20])).toEqual([])
    expect(durationWarnings([9, 20, 20, 20, 20])[0]).toContain('hook')
    expect(durationWarnings([6, 40, 40, 40, 40])[0]).toContain(`${MAX_VIDEO_SEC} s`)
  })
})
