import type { Caption } from '@sherpas/shared'

/**
 * Captions synced to the voice (SPEC §4): the words of the narration, each with the time the voice
 * says it, grouped into short cues that read in one glance.
 */

export interface TimedWord {
  readonly text: string
  readonly startSec: number
  readonly endSec: number
}

/** A cue holds at most this many words and characters, so it fits one line (see `MAX_MERGED_CUE_CHARS`). */
export const MAX_WORDS_PER_CUE = 6
export const MAX_CUE_CHARS = 40
/** A comma ends the cue only once it has this many words, so short phrases are not split. */
export const MIN_WORDS_BEFORE_COMMA_BREAK = 3
/** A silence this long between two words starts a new cue. */
export const CUE_BREAK_GAP_SEC = 0.35
/** How long a cue stays after its last word when the next one is not right behind. */
export const CUE_HOLD_SEC = 0.4
/** Shortest cue, for words the voice says in no time (a lone symbol). */
export const MIN_CUE_SEC = 0.1
/** A lone word left by the word or character limit joins the cue before it if the two fit in this. */
export const MAX_MERGED_CUE_CHARS = 48
/** Cue times are kept to the millisecond. */
const MS_PER_SEC = 1000

const ENDS_SENTENCE = /[.!?;:]["')\]]*$/
const ENDS_CLAUSE = /,["')\]]*$/

const cueText = (words: readonly TimedWord[]): string => words.map((word) => word.text).join(' ')

/** Whether `next` starts a new cue after the words collected so far. */
const startsNewCue = (cue: readonly TimedWord[], next: TimedWord): boolean => {
  const last = cue[cue.length - 1]
  return (
    cue.length >= MAX_WORDS_PER_CUE ||
    cueText([...cue, next]).length > MAX_CUE_CHARS ||
    ENDS_SENTENCE.test(last.text) ||
    (ENDS_CLAUSE.test(last.text) && cue.length >= MIN_WORDS_BEFORE_COMMA_BREAK) ||
    next.startSec - last.endSec >= CUE_BREAK_GAP_SEC
  )
}

const groupWords = (words: readonly TimedWord[]): TimedWord[][] =>
  words.reduce<TimedWord[][]>((groups, word) => {
    const current = groups[groups.length - 1]
    if (!current || startsNewCue(current, word)) return [...groups, [word]]
    return [...groups.slice(0, -1), [...current, word]]
  }, [])

/** Whether `group` is one word cut off from the cue before only by the length limits ("…when you plan" / "to."). */
const isOrphan = (previous: readonly TimedWord[] | undefined, group: readonly TimedWord[]): previous is TimedWord[] => {
  if (!previous || group.length !== 1) return false
  const last = previous[previous.length - 1]
  return (
    !ENDS_SENTENCE.test(last.text) &&
    !ENDS_CLAUSE.test(last.text) &&
    group[0].startSec - last.endSec < CUE_BREAK_GAP_SEC &&
    cueText([...previous, ...group]).length <= MAX_MERGED_CUE_CHARS
  )
}

const mergeOrphans = (groups: readonly TimedWord[][]): TimedWord[][] =>
  groups.reduce<TimedWord[][]>((merged, group) => {
    const previous = merged[merged.length - 1]
    return isOrphan(previous, group) ? [...merged.slice(0, -1), [...previous, ...group]] : [...merged, group]
  }, [])

const toMs = (seconds: number): number => Math.round(seconds * MS_PER_SEC) / MS_PER_SEC

/**
 * Cues of a few words each, timed by the real words: a cue starts with its first word and lasts until
 * the next cue starts, or `CUE_HOLD_SEC` after its last word when the voice pauses.
 */
export const cuesFromWords = (words: readonly TimedWord[]): Caption[] => {
  const groups = mergeOrphans(groupWords(words))
  return groups.map((group, index) => {
    const startSec = group[0].startSec
    const spokenEnd = group[group.length - 1].endSec
    const nextStart = groups[index + 1]?.[0].startSec ?? Number.POSITIVE_INFINITY
    const endSec = Math.max(Math.min(nextStart, spokenEnd + CUE_HOLD_SEC), startSec + MIN_CUE_SEC)
    return { text: cueText(group), startSec: toMs(startSec), endSec: toMs(endSec) }
  })
}
