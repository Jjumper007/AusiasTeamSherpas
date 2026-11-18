import { describe, expect, it } from 'vitest'
import type { TimedWord } from './captions'
import { fakeSpokenWords } from './test-helpers'
import { matchWords, timeScriptWords } from './word-alignment'

const heard = (...words: ReadonlyArray<readonly [string, number, number]>): TimedWord[] =>
  words.map(([text, startSec, endSec]) => ({ text, startSec, endSec }))

describe('matchWords', () => {
  it('matches words in order, ignoring case and punctuation', () => {
    expect(matchWords(['Hi', 'Dan,', '$1,427,456;'], ['hi', 'dan', '1427456'])).toEqual([0, 1, 2])
  })

  it('leaves out words the transcript says differently', () => {
    expect(matchWords(['gap', 'of', '$1.4M.', 'Next'], ['gap', 'of', '1.4', 'million.', 'next'])).toEqual([0, 1, undefined, 4])
  })
})

describe('timeScriptWords', () => {
  it('gives each script word the time of the word the voice said, keeping the script text', () => {
    const words = timeScriptWords('Hello, Dan.', heard(['hello', 0.1, 0.4], ['Dan', 0.5, 0.8]), 1)
    expect(words).toEqual([
      { text: 'Hello,', startSec: 0.1, endSec: 0.4 },
      { text: 'Dan.', startSec: 0.5, endSec: 0.8 },
    ])
  })

  it('spreads a word said differently over the time between its neighbours', () => {
    const spoken = heard(['gap', 0, 0.3], ['of', 0.3, 0.5], ['1.4', 0.5, 0.9], ['million', 0.9, 1.4], ['next', 1.5, 1.8])
    const words = timeScriptWords('gap of $1.4M next', spoken, 2)
    expect(words[2]).toEqual({ text: '$1.4M', startSec: 0.5, endSec: 1.5 })
    expect(words[3]).toEqual({ text: 'next', startSec: 1.5, endSec: 1.8 })
  })

  it('spreads several unmatched words by their length', () => {
    const words = timeScriptWords('a bbb c', heard(['a', 0, 1], ['x', 1, 2], ['c', 5, 6]), 6)
    expect(words[1]).toEqual({ text: 'bbb', startSec: 1, endSec: 5 })
  })

  it('spreads unmatched words at the edges up to where the voice starts or stops', () => {
    const words = timeScriptWords('Oh hi', heard(['hi', 1, 1.5]), 3)
    expect(words[0]).toEqual({ text: 'Oh', startSec: 1, endSec: 1 })
    const tail = timeScriptWords('hi there', heard(['hi', 0.2, 0.5], ['their', 0.6, 1.2]), 3)
    expect(tail[1]).toEqual({ text: 'there', startSec: 0.5, endSec: 1.2 })
  })

  it('spreads the whole narration over the audio when nothing was heard', () => {
    const words = timeScriptWords('ab cd', [], 4)
    expect(words).toEqual([
      { text: 'ab', startSec: 0, endSec: 2 },
      { text: 'cd', startSec: 2, endSec: 4 },
    ])
  })

  it('keeps every script word, in order, when the transcript has a different word count', () => {
    const narration = 'Your score is 52 out of 100, which the plan calls vulnerable.'
    const spoken = fakeSpokenWords('Your score is fifty two out of one hundred which the plan calls vulnerable')
    const words = timeScriptWords(narration, spoken, 5)
    expect(words.map((word) => word.text).join(' ')).toBe(narration)
    expect(words.every((word, index) => index === 0 || word.startSec >= words[index - 1].startSec)).toBe(true)
  })
})
