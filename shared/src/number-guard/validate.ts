import type { Facts } from '../facts'
import { buildAccepted, isAccepted } from './accepted'
import { toError } from './errors'
import { findNumberTokens, maskPatterns, mustComeFromFacts, type NumberToken } from './tokens'
import { scanTsx, type Region } from './tsx-scan'
import { TSX_STRING_MASKS, isStructuralString } from './tsx-structural'
import type { NumberGuardResult } from './types'

/**
 * The "we never invent numbers" check. Rules, in order:
 *
 * 1. A number of 1 or 2 digits is always allowed, unless it carries a K/M/B scale ("$5K" is 5,000).
 * 2. Values in `ALWAYS_ALLOWED_VALUES` are allowed (the 0–100 scale of scores and percentages).
 * 3. Any other number must come from a fact:
 *    - without a scale, it must equal the exact fact value, what `fmt.fact` prints (whole dollars,
 *      whole percent), the exact percentage of a `percent` fact, or the `fmt.round` rounding written
 *      in full ("$1,400,000");
 *    - with a scale, it must be exactly what `fmt.round` prints for a fact ("$1.4M", "1.4 million"),
 *      so "$1.5M" and "$1,427K" are rejected for a fact of 1427455.89.
 *    Calendar years get no special case: 2044 is accepted because it is a `calendar_year` fact.
 * 4. There is no tolerance: the comparison only absorbs floating point noise.
 */

/** The top of the score and percentage scales ("52 out of 100") is never an invented figure. */
const ALWAYS_ALLOWED_VALUES: readonly number[] = [100]

/** US retirement plan names, which are not figures: "401(k)", "401k", "403(b)". */
const PLAN_NAME_PATTERN = /\b40[13]\s?\(?[kb]\b\)?/gi
const TEXT_MASKS: readonly RegExp[] = [PLAN_NAME_PATTERN]
const NUMERIC_SEPARATOR = /_/g
const DIGITS = /\d/g

const textTokens = (
  text: string,
  offset: number,
  masks: readonly RegExp[],
): readonly NumberToken[] => findNumberTokens(maskPatterns(text, masks), offset)

/** A numeric literal from source code (`1500000`, `1_500_000`), read as an unscaled number. */
const literalToken = (raw: string, start: number): readonly NumberToken[] => {
  const value = Number(raw.replace(NUMERIC_SEPARATOR, ''))
  if (!Number.isFinite(value)) return []
  const digitCount = (raw.match(DIGITS) ?? []).length
  return [{ raw, start, value, mantissa: value, scale: null, digitCount }]
}

const regionTokens = (source: string, region: Region): readonly NumberToken[] => {
  const text = source.slice(region.start, region.end)
  if (region.kind === 'literal') return literalToken(text, region.start)
  if (region.kind === 'jsxText') return textTokens(text, region.start, TEXT_MASKS)
  if (isStructuralString(text)) return []
  return textTokens(text, region.start, [...TEXT_MASKS, ...TSX_STRING_MASKS])
}

const check = (source: string, facts: Facts, tokens: readonly NumberToken[]): NumberGuardResult => {
  const accepted = buildAccepted(facts)
  const errors = tokens
    .filter(mustComeFromFacts)
    .filter((token) => !ALWAYS_ALLOWED_VALUES.includes(token.value))
    .filter((token) => !isAccepted(token, accepted))
    .map((token) => toError(source, token, accepted))
  return { ok: errors.length === 0, errors }
}

/**
 * Checks narration or any other prose (chapter titles and bodies, call to action).
 * Every number in the text is a displayed figure.
 */
export const validateNarration = (text: string, facts: Facts): NumberGuardResult =>
  check(text, facts, textTokens(text, 0, TEXT_MASKS))

/**
 * Checks TSX source. Only the places where a figure can reach the screen are checked:
 * JSX text, string and template literals, numeric literals passed to `fmt`, and a numeric literal
 * that is a whole JSX child. Numeric literals anywhere else, comments, imports and CSS/SVG strings
 * are structural (see `tsx-scan.ts` and `tsx-structural.ts`).
 */
export const validateTsx = (source: string, facts: Facts): NumberGuardResult =>
  check(
    source,
    facts,
    scanTsx(source).flatMap((region) => regionTokens(source, region)),
  )
