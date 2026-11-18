import { describe, expect, test } from 'vitest'
import { fadeInOut } from './fade'

describe('fadeInOut', () => {
  test('fades in, holds and fades out over a long span', () => {
    expect(fadeInOut(100, 100, 200, 4)).toBe(0)
    expect(fadeInOut(102, 100, 200, 4)).toBe(0.5)
    expect(fadeInOut(150, 100, 200, 4)).toBe(1)
    expect(fadeInOut(198, 100, 200, 4)).toBe(0.5)
    expect(fadeInOut(200, 100, 200, 4)).toBe(0)
  })

  test('handles a cue exactly two fades long (the span that broke the render: 623–631)', () => {
    expect(fadeInOut(627, 623, 631, 4)).toBe(1)
    expect(fadeInOut(625, 623, 631, 4)).toBe(0.5)
  })

  test('shortens the fades for a cue shorter than two fades', () => {
    expect(fadeInOut(11, 10, 13, 4)).toBeCloseTo(2 / 3)
  })

  test('shows a zero-length cue at full opacity on its frame and hides it elsewhere', () => {
    expect(fadeInOut(10, 10, 10, 4)).toBe(1)
    expect(fadeInOut(11, 10, 10, 4)).toBe(0)
  })
})
