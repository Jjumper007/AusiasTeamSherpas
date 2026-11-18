import type { Fact, FactUnit } from '../facts'

/**
 * `fmt` is the only place where a fact value becomes display text.
 * Pure string maths with no Node or Intl dependency, so it is safe in the browser and Remotion bundles.
 * The number guard accepts exactly what these functions print (see `accepted.ts`).
 */

/** A raw value, or a fact whose `value` is used. */
export type FmtInput = number | Fact

export type CompactScale = 'K' | 'M' | 'B'

/** The rounding `fmt.round` prints: `{ mantissa: 1.4, scale: 'M' }` for 1427455.89. */
export interface CompactParts {
  readonly mantissa: number
  readonly scale: CompactScale | null
}

export const SCALE_FACTORS: Readonly<Record<CompactScale, number>> = { K: 1e3, M: 1e6, B: 1e9 }

/** Decimals kept per scale: "$34K" but "$1.4M". */
const SCALE_DECIMALS: Readonly<Record<CompactScale, number>> = { K: 0, M: 1, B: 1 }
const SCALES_ASCENDING: readonly CompactScale[] = ['K', 'M', 'B']
/** A mantissa must stay below this, otherwise the next scale is used ("$1M", never "$1000K"). */
const MANTISSA_LIMIT = 1000
const DECIMAL_BASE = 10
const PERCENT_BASE = 100
const SIGNIFICANT_DIGITS = 12
const CURRENCY_SYMBOL = '$'
const THOUSANDS_GAP = /\B(?=(\d{3})+(?!\d))/g

const valueOf = (input: FmtInput): number => {
  const value = typeof input === 'number' ? input : input.value
  if (!Number.isFinite(value)) {
    throw new RangeError(`fmt: expected a finite number, got ${String(value)}`)
  }
  return value
}

const signOf = (value: number): string => (value < 0 ? '-' : '')

/** Whole number with thousands separators, half rounded up: 1427455.89 → "1,427,456". */
const wholeNumber = (value: number): string =>
  String(Math.round(Math.abs(value))).replace(THOUSANDS_GAP, ',')

const mantissaAt = (absolute: number, scale: CompactScale): number => {
  const precision = DECIMAL_BASE ** SCALE_DECIMALS[scale]
  return Math.round((absolute * precision) / SCALE_FACTORS[scale]) / precision
}

/** Splits a value into the mantissa and scale that `fmt.round` prints. The sign is dropped. */
export const compactParts = (input: FmtInput): CompactParts => {
  const absolute = Math.abs(valueOf(input))
  if (Math.round(absolute) < MANTISSA_LIMIT) return { mantissa: Math.round(absolute), scale: null }

  const fitting = SCALES_ASCENDING.find((scale) => mantissaAt(absolute, scale) < MANTISSA_LIMIT)
  const scale = fitting ?? 'B'
  return { mantissa: mantissaAt(absolute, scale), scale }
}

const compactNumber = (value: number): string => {
  const { mantissa, scale } = compactParts(value)
  return scale === null ? wholeNumber(mantissa) : `${String(mantissa)}${scale}`
}

const plural = (value: number, noun: string): string => {
  const whole = Math.round(value)
  return `${wholeNumber(whole)} ${noun}${Math.abs(whole) === 1 ? '' : 's'}`
}

/** Exact amount in whole dollars (cents are never shown): 1427455.89 → "$1,427,456". */
const currency = (input: FmtInput): string => {
  const value = valueOf(input)
  return `${signOf(value)}${CURRENCY_SYMBOL}${wholeNumber(value)}`
}

/** Removes binary floating point noise (0.075 * 100 is 7.499999999999999) before rounding. */
const withoutFloatNoise = (value: number): number => Number(value.toPrecision(SIGNIFICANT_DIGITS))

/** Whole percent from a fraction: 0.4928 → "49%". */
const percent = (input: FmtInput): string => {
  const value = valueOf(input)
  return `${signOf(value)}${wholeNumber(withoutFloatNoise(value * PERCENT_BASE))}%`
}

/** A span of years: 17 → "17 years". */
const years = (input: FmtInput): string => plural(valueOf(input), 'year')

const EXACT_BY_UNIT: Readonly<Record<FactUnit, (value: number) => string>> = {
  usd: currency,
  percent,
  points: (value) => `${signOf(value)}${wholeNumber(value)}`,
  years,
  months: (value) => plural(value, 'month'),
  calendar_year: (value) => String(Math.round(value)),
  count: (value) => `${signOf(value)}${wholeNumber(value)}`,
}

/** Exact display of a fact, chosen by its unit: usd → "$1,427,456", percent → "49%", years → "17 years". */
const fact = (input: Fact): string => EXACT_BY_UNIT[input.unit](valueOf(input))

/**
 * Short display. A raw number or a `usd` fact becomes "$1.4M" / "$34K" / "$950",
 * a `count` fact becomes "12K", and every other unit falls back to `fmt.fact`.
 */
const round = (input: FmtInput): string => {
  const value = valueOf(input)
  if (typeof input === 'number' || input.unit === 'usd') {
    return `${signOf(value)}${CURRENCY_SYMBOL}${compactNumber(value)}`
  }
  if (input.unit === 'count') return `${signOf(value)}${compactNumber(value)}`
  return fact(input)
}

export const fmt = { currency, percent, round, years, fact } as const
