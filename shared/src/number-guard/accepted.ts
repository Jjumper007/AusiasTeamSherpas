import type { Fact, Facts } from '../facts'
import { fmt, type CompactScale } from './fmt'
import { findNumberTokens, type NumberToken } from './tokens'
import type { NearestFact } from './types'

/** Everything the guard accepts for one fact. */
export interface AcceptedFact {
  readonly name: string
  readonly fact: Fact
  /** What `fmt` prints for it, most compact first. */
  readonly forms: readonly string[]
  /** Values accepted when written without a scale: exact, whole, percentage, and the rounding in full. */
  readonly plainValues: readonly number[]
  /** Roundings accepted with a scale, exactly as `fmt.round` prints them. */
  readonly scaled: readonly { readonly mantissa: number; readonly scale: CompactScale }[]
}

/** Two numbers match when they differ only by floating point noise. There is no rounding tolerance. */
const FLOAT_TOLERANCE = 1e-9
const PERCENT_BASE = 100

const isSame = (a: number, b: number): boolean =>
  Math.abs(a - b) <= FLOAT_TOLERANCE * Math.max(1, Math.abs(a), Math.abs(b))

const literalValues = (fact: Fact): readonly number[] =>
  fact.unit === 'percent' ? [fact.value, fact.value * PERCENT_BASE] : [fact.value]

const toAcceptedFact = (name: string, fact: Fact): AcceptedFact => {
  const forms = [...new Set([fmt.round(fact), fmt.fact(fact)])]
  const formTokens = forms.flatMap((form) => findNumberTokens(form).slice(0, 1))
  return {
    name,
    fact,
    forms,
    plainValues: [...literalValues(fact), ...formTokens.map((token) => token.value)].map(Math.abs),
    scaled: formTokens.flatMap(({ mantissa, scale }) => (scale === null ? [] : [{ mantissa, scale }])),
  }
}

/** Derives the accepted values from what `fmt` prints, so the validator and `fmt` cannot drift apart. */
export const buildAccepted = (facts: Facts): readonly AcceptedFact[] =>
  Object.entries(facts).map(([name, fact]) => toAcceptedFact(name, fact))

const matchesFact = (token: NumberToken, accepted: AcceptedFact): boolean =>
  token.scale === null
    ? accepted.plainValues.some((value) => isSame(value, token.value))
    : accepted.scaled.some(
        (form) => form.scale === token.scale && isSame(form.mantissa, token.mantissa),
      )

export const isAccepted = (token: NumberToken, accepted: readonly AcceptedFact[]): boolean =>
  accepted.some((candidate) => matchesFact(token, candidate))

const relativeDistance = (a: number, b: number): number =>
  Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), Number.MIN_VALUE)

const distanceTo = (value: number, accepted: AcceptedFact): number =>
  Math.min(...accepted.plainValues.map((candidate) => relativeDistance(candidate, value)))

/** The fact whose accepted values are closest to `value`, or `null` when there are no facts. */
export const findNearestFact = (
  value: number,
  accepted: readonly AcceptedFact[],
): NearestFact | null => {
  const [first, ...rest] = accepted
  if (first === undefined) return null

  const nearest = rest.reduce(
    (best, candidate) => (distanceTo(value, candidate) < distanceTo(value, best) ? candidate : best),
    first,
  )
  return {
    name: nearest.name,
    value: nearest.fact.value,
    unit: nearest.fact.unit,
    acceptedForms: nearest.forms,
  }
}
