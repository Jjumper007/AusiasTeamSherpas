import { describe, expect, it } from 'vitest'
import { CUE_HOLD_SEC, cuesFromWords, MAX_WORDS_PER_CUE, type TimedWord } from './captions'
import { fakeSpokenWords } from './test-helpers'

const word = (text: string, startSec: number, endSec = startSec + 0.3): TimedWord => ({ text, startSec, endSec })

describe('cuesFromWords', () => {
  it('never puts more than the maximum words in one cue', () => {
    const words = 'one two three four five six seven eight nine'.split(' ').map((text, index) => word(text, index * 0.3, index * 0.3 + 0.25))
    const cues = cuesFromWords(words)
    expect(cues.map((cue) => cue.text)).toEqual(['one two three four five six', 'seven eight nine'])
    expect(cues.every((cue) => cue.text.split(' ').length <= MAX_WORDS_PER_CUE)).toBe(true)
  })

  it('ends a cue at the end of a sentence, and at a comma once it has a few words', () => {
    const texts = ['Hi.', 'Your', 'plan,', 'in', 'short,', 'climbs.']
    const cues = cuesFromWords(texts.map((text, index) => word(text, index * 0.3, index * 0.3 + 0.25)))
    expect(cues.map((cue) => cue.text)).toEqual(['Hi.', 'Your plan, in short,', 'climbs.'])
  })

  it('joins a lone last word to the cue before instead of showing it alone', () => {
    const texts = ['starting', 'with', 'retiring', 'when', 'you', 'plan', 'to.']
    const cues = cuesFromWords(texts.map((text, index) => word(text, index * 0.3, index * 0.3 + 0.25)))
    expect(cues.map((cue) => cue.text)).toEqual(['starting with retiring when you plan to.'])
  })

  it('keeps a one-word sentence as its own cue', () => {
    const cues = cuesFromWords([word('Hi.', 0, 0.25), word('Dan', 0.3, 0.55)])
    expect(cues.map((cue) => cue.text)).toEqual(['Hi.', 'Dan'])
  })

  it('starts each cue with its first word and runs it until the next cue starts', () => {
    const cues = cuesFromWords([word('Hi.', 0.1, 0.4), word('Dan', 0.5, 0.8)])
    expect(cues[0]).toEqual({ text: 'Hi.', startSec: 0.1, endSec: 0.5 })
  })

  it('holds a cue only briefly after its last word when the voice pauses', () => {
    const cues = cuesFromWords([word('Hi', 0, 0.3), word('Dan', 2, 2.3)])
    expect(cues.map((cue) => cue.text)).toEqual(['Hi', 'Dan'])
    expect(cues[0].endSec).toBeCloseTo(0.3 + CUE_HOLD_SEC)
    expect(cues[1].endSec).toBeCloseTo(2.3 + CUE_HOLD_SEC)
  })
})

describe('cuesFromWords on a whole narration', () => {
  it('covers the narration in order with cues that do not overlap', () => {
    const narration = 'Daniel, here is your plan as a mountain route, starting with retiring when you plan to.'
    const cues = cuesFromWords(fakeSpokenWords(narration))
    expect(cues.map((cue) => cue.text).join(' ')).toBe(narration)
    expect(cues.every((cue, index) => index === 0 || cue.startSec >= cues[index - 1].endSec - 1e-9)).toBe(true)
    expect(cues.every((cue) => cue.endSec > cue.startSec)).toBe(true)
  })
})
