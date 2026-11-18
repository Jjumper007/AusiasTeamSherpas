import { describe, expect, test } from 'vitest'
import { activeCue, cuesForScene } from './captions'

describe('cuesForScene', () => {
  test('uses the timed captions when the scene has them', () => {
    const captions = [
      { text: 'Hello Dan', startSec: 0, endSec: 1.2 },
      { text: 'this is your route', startSec: 1.2, endSec: 3 },
    ]

    const cues = cuesForScene('Hello Dan this is your route', { durationSec: 3, captions })

    expect(cues).toEqual(captions)
  })

  test('splits the narration into short cues when there are no timed captions', () => {
    const narration = 'one two three four five six seven eight nine ten eleven twelve'

    const cues = cuesForScene(narration, { durationSec: 6 })

    expect(cues.map((cue) => cue.text)).toEqual([
      'one two three four five six seven',
      'eight nine ten eleven twelve',
    ])
  })

  test('covers the whole scene without gaps or overlaps', () => {
    const narration = 'one two three four five six seven eight nine ten eleven twelve'

    const cues = cuesForScene(narration, { durationSec: 6 })

    expect(cues[0]?.startSec).toBe(0)
    expect(cues[0]?.endSec).toBe(cues[1]?.startSec)
    expect(cues[1]?.endSec).toBeCloseTo(6)
  })

  test('gives longer cues more time', () => {
    const narration = 'aaaaaaaaaa aaaaaaaaaa aaaaaaaaaa aaaaaaaaaa aaaaaaaaaa aaaaaaaaaa aaaaaaaaaa b'

    const [long, short] = cuesForScene(narration, { durationSec: 10 })

    expect(long && short && long.endSec - long.startSec > short.endSec - short.startSec).toBe(true)
  })

  test('returns no cues for an empty narration', () => {
    expect(cuesForScene('   ', { durationSec: 5 })).toEqual([])
  })
})

describe('activeCue', () => {
  const cues = [
    { text: 'first', startSec: 0, endSec: 2 },
    { text: 'second', startSec: 2, endSec: 4 },
  ]

  test('returns the cue being spoken at a given time', () => {
    expect(activeCue(cues, 2.5)?.text).toBe('second')
  })

  test('returns nothing after the last cue ends', () => {
    expect(activeCue(cues, 4.5)).toBeUndefined()
  })
})
