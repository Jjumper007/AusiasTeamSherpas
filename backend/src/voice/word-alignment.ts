import type { TimedWord } from './captions'

/**
 * Times the script's own words with the words Scribe heard in the audio. Captions show the script
 * ("$1.4M"), not the transcript ("1.4 million"), so each script word takes the time of the spoken word
 * it matches, in order. Script words with no match share, by length, the time between their neighbours.
 */

/** Lower-case letters and digits only, so "Route," matches "route" and "$1,427,456;" matches "1427456". */
const normalize = (word: string): string => word.toLowerCase().replace(/[^a-z0-9]/g, '')

const scriptWordsOf = (narration: string): string[] => narration.split(/\s+/).filter((word) => word.length > 0)

/** Longest common subsequence of the two word lists: for each script word, the index of its spoken match. */
export const matchWords = (script: readonly string[], spoken: readonly string[]): ReadonlyArray<number | undefined> => {
  const a = script.map(normalize)
  const b = spoken.map(normalize)
  // lengths[i][j]: LCS length of a[i..] and b[j..].
  const lengths = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      lengths[i][j] =
        a[i] !== '' && a[i] === b[j] ? lengths[i + 1][j + 1] + 1 : Math.max(lengths[i + 1][j], lengths[i][j + 1])
    }
  }
  const matches = new Array<number | undefined>(a.length).fill(undefined)
  let [i, j] = [0, 0]
  while (i < a.length && j < b.length) {
    if (a[i] !== '' && a[i] === b[j]) {
      matches[i] = j
      i += 1
      j += 1
    } else if (lengths[i + 1][j] >= lengths[i][j + 1]) {
      i += 1
    } else {
      j += 1
    }
  }
  return matches
}

/** Splits `[startSec, endSec]` among `words` in proportion to their length. */
const spreadByCharacters = (words: readonly string[], startSec: number, endSec: number): TimedWord[] => {
  const span = Math.max(0, endSec - startSec)
  const totalChars = words.reduce((total, word) => total + word.length, 0)
  return words.reduce<TimedWord[]>((timed, text) => {
    const wordStart = timed.at(-1)?.endSec ?? startSec
    return [...timed, { text, startSec: wordStart, endSec: wordStart + (span * text.length) / totalChars }]
  }, [])
}

/** Runs of consecutive script words that are all matched or all unmatched. */
const runsOf = (matches: ReadonlyArray<number | undefined>): Array<{ readonly from: number; readonly to: number }> =>
  matches.reduce<Array<{ from: number; to: number }>>((runs, match, index) => {
    const last = runs.at(-1)
    const sameKind = last !== undefined && (matches[last.from] === undefined) === (match === undefined)
    return sameKind ? [...runs.slice(0, -1), { from: last.from, to: index + 1 }] : [...runs, { from: index, to: index + 1 }]
  }, [])

/**
 * The words of `narration`, each timed from `spoken` (Scribe's words for the same audio).
 * With no spoken words at all, the narration is spread over the whole audio.
 */
export const timeScriptWords = (narration: string, spoken: readonly TimedWord[], audioSec: number): TimedWord[] => {
  const script = scriptWordsOf(narration)
  const matches = matchWords(script, spoken.map((word) => word.text))
  const voiceStart = spoken[0]?.startSec ?? 0
  const voiceEnd = spoken.at(-1)?.endSec ?? audioSec

  return runsOf(matches).flatMap(({ from, to }) => {
    const first = matches[from]
    if (first !== undefined) {
      return script.slice(from, to).map((text, offset) => {
        const heard = spoken[matches[from + offset] as number]
        return { text, startSec: heard.startSec, endSec: heard.endSec }
      })
    }
    const before = from > 0 ? matches[from - 1] : undefined
    const after = to < script.length ? matches[to] : undefined
    const startSec = before === undefined ? voiceStart : spoken[before].endSec
    const endSec = after === undefined ? voiceEnd : spoken[after].startSec
    return spreadByCharacters(script.slice(from, to), startSec, endSec)
  })
}
