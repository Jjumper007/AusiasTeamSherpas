/// <reference types="node" />
import { describe, expect, it } from 'vitest'
import { mp3DurationSec } from './mp3-duration'
import { fakeMp3, FRAME_SEC } from './test-helpers'

describe('mp3DurationSec', () => {
  it('adds up the length of every Layer III frame', () => {
    expect(mp3DurationSec(fakeMp3(100))).toBeCloseTo(100 * FRAME_SEC, 6)
  })

  it('skips an ID3v2 tag at the start', () => {
    expect(mp3DurationSec(fakeMp3(10, 300))).toBeCloseTo(10 * FRAME_SEC, 6)
  })

  it('does not count a Xing/Info header frame as audio', () => {
    const mp3 = fakeMp3(10)
    const withInfo = Uint8Array.from([...mp3.slice(0, 40), ...Buffer.from('Info'), ...mp3.slice(44)])
    expect(mp3DurationSec(withInfo)).toBeCloseTo(9 * FRAME_SEC, 6)
  })

  it('is 0 for bytes that are not MP3', () => {
    expect(mp3DurationSec(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))).toBe(0)
  })
})
