import { SCALE_FACTORS, type CompactScale } from './fmt'

/** A number found in text, with its scale suffix applied. */
export interface NumberToken {
  /** As written: "$1.4M", "49%", "1,427,456". */
  readonly raw: string
  /** Offset of `raw` in the validated text or source. */
  readonly start: number
  /** Value with the scale applied: 1400000 for "$1.4M". */
  readonly value: number
  /** Value before the scale: 1.4 for "$1.4M". */
  readonly mantissa: number
  readonly scale: CompactScale | null
  /** Digits written, integer and decimal part together. */
  readonly digitCount: number
}

/** Numbers with this many digits or fewer are always allowed, unless they carry a K/M/B scale. */
export const MAX_FREE_DIGITS = 2

/**
 * `$` + integer (with optional thousands separators) + decimals + suffix.
 * A number cannot start right after a letter, digit, `_`, `.` or `#`, which skips "h264" and "#1a2b3c".
 */
const NUMBER_PATTERN =
  /(?<![\w.#])(\$\s?)?(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?(\s?(?:%|percent\b|(?:thousand|million|billion)s?\b|[kmb]\b))?/gi

const SUFFIX_SCALES: Readonly<Record<string, CompactScale>> = {
  k: 'K',
  thousand: 'K',
  m: 'M',
  million: 'M',
  b: 'B',
  billion: 'B',
}
/** "5m" is five metres or minutes; a lowercase m or b only means millions or billions after a `$`. */
const AMBIGUOUS_SUFFIXES: readonly string[] = ['m', 'b']
const PERCENT_SUFFIXES: readonly string[] = ['%', 'percent']
const PLURAL_ENDING = /s$/

type SuffixKind = { readonly keep: boolean; readonly scale: CompactScale | null }

const classifySuffix = (suffix: string, hasCurrency: boolean): SuffixKind => {
  const word = suffix.trim()
  if (word === '') return { keep: false, scale: null }
  if (PERCENT_SUFFIXES.includes(word.toLowerCase())) return { keep: true, scale: null }
  if (AMBIGUOUS_SUFFIXES.includes(word) && !hasCurrency) return { keep: false, scale: null }
  return { keep: true, scale: SUFFIX_SCALES[word.toLowerCase().replace(PLURAL_ENDING, '')] ?? null }
}

const toToken = (match: RegExpMatchArray, offset: number): NumberToken => {
  const [whole, currency = '', integer = '', decimals = '', suffix = ''] = match
  const { keep, scale } = classifySuffix(suffix, currency !== '')
  const mantissa = Number(`${integer.replaceAll(',', '')}${decimals}`)
  return {
    raw: keep ? whole : whole.slice(0, whole.length - suffix.length),
    start: offset + (match.index ?? 0),
    value: scale === null ? mantissa : mantissa * SCALE_FACTORS[scale],
    mantissa,
    scale,
    digitCount: integer.replaceAll(',', '').length + Math.max(decimals.length - 1, 0),
  }
}

/** Replaces every match with spaces, so the offsets of the rest of the text do not move. */
export const maskPatterns = (text: string, patterns: readonly RegExp[]): string =>
  patterns.reduce(
    (masked, pattern) => masked.replace(pattern, (found) => ' '.repeat(found.length)),
    text,
  )

/** Every number in `text`. `offset` is where `text` starts inside the full source. */
export const findNumberTokens = (text: string, offset = 0): readonly NumberToken[] =>
  [...text.matchAll(NUMBER_PATTERN)].map((match) => toToken(match, offset))

/** Whether the guard has to trace this number back to a fact. */
export const mustComeFromFacts = (token: NumberToken): boolean =>
  token.scale !== null || token.digitCount > MAX_FREE_DIGITS
