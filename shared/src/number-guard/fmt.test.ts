import { describe, expect, test } from 'vitest'
import type { Fact } from '../facts'
import { compactParts, fmt } from './fmt'

const usd = (value: number): Fact => ({ value, unit: 'usd', label: 'Some amount' })

describe('fmt.round', () => {
  test('rounds millions to one decimal', () => {
    expect(fmt.round(1427455.89)).toBe('$1.4M')
    expect(fmt.round(1166000)).toBe('$1.2M')
    expect(fmt.round(1600000)).toBe('$1.6M')
  })

  test('drops a trailing .0 on round millions', () => {
    expect(fmt.round(1000000)).toBe('$1M')
  })

  test('rounds thousands to whole K', () => {
    expect(fmt.round(34164.77)).toBe('$34K')
    expect(fmt.round(15032.01)).toBe('$15K')
    expect(fmt.round(250000)).toBe('$250K')
  })

  test('leaves amounts under a thousand as whole dollars', () => {
    expect(fmt.round(950.4)).toBe('$950')
  })

  test('promotes to the next scale instead of printing 1000K', () => {
    expect(fmt.round(999600)).toBe('$1M')
    expect(fmt.round(999400)).toBe('$999K')
  })

  test('handles billions and negative amounts', () => {
    expect(fmt.round(2340000000)).toBe('$2.3B')
    expect(fmt.round(-34164.77)).toBe('-$34K')
  })

  test('accepts a fact and picks the format from its unit', () => {
    expect(fmt.round(usd(1427455.89))).toBe('$1.4M')
    expect(fmt.round({ value: 0.4928, unit: 'percent', label: 'Share' })).toBe('49%')
    expect(fmt.round({ value: 12400, unit: 'count', label: 'Members' })).toBe('12K')
    expect(fmt.round({ value: 17, unit: 'years', label: 'Years' })).toBe('17 years')
  })
})

describe('fmt.currency', () => {
  test('prints whole dollars with thousands separators', () => {
    expect(fmt.currency(1427455.89)).toBe('$1,427,456')
    expect(fmt.currency(250000)).toBe('$250,000')
    expect(fmt.currency(15032.01)).toBe('$15,032')
    expect(fmt.currency(42)).toBe('$42')
  })

  test('accepts a fact and negative amounts', () => {
    expect(fmt.currency(usd(34164.77))).toBe('$34,165')
    expect(fmt.currency(-1200.5)).toBe('-$1,201')
  })
})

describe('fmt.percent', () => {
  test('formats a fraction as a whole percent', () => {
    expect(fmt.percent(0.4928)).toBe('49%')
    expect(fmt.percent(1)).toBe('100%')
    expect(fmt.percent(0.075)).toBe('8%')
  })

  test('accepts a percent fact', () => {
    expect(fmt.percent({ value: 0.4928, unit: 'percent', label: 'Share' })).toBe('49%')
  })
})

describe('fmt.years', () => {
  test('formats a number of years with the right plural', () => {
    expect(fmt.years(17)).toBe('17 years')
    expect(fmt.years(1)).toBe('1 year')
    expect(fmt.years({ value: 91, unit: 'years', label: 'Age' })).toBe('91 years')
  })
})

describe('fmt input checks', () => {
  test('throws a clear error when the value is not a finite number', () => {
    expect(() => fmt.round(Number.NaN)).toThrow('fmt: expected a finite number, got NaN')
    expect(() => fmt.currency(usd(Number.POSITIVE_INFINITY))).toThrow(RangeError)
  })
})

describe('fmt.fact', () => {
  test('picks the exact format for each unit', () => {
    expect(fmt.fact(usd(1427455.89))).toBe('$1,427,456')
    expect(fmt.fact({ value: 0.4928, unit: 'percent', label: 'Share' })).toBe('49%')
    expect(fmt.fact({ value: 52, unit: 'points', label: 'Score' })).toBe('52')
    expect(fmt.fact({ value: 17, unit: 'years', label: 'Years' })).toBe('17 years')
    expect(fmt.fact({ value: 6, unit: 'months', label: 'Buffer' })).toBe('6 months')
    expect(fmt.fact({ value: 1, unit: 'months', label: 'Buffer' })).toBe('1 month')
    expect(fmt.fact({ value: 2044, unit: 'calendar_year', label: 'Year' })).toBe('2044')
    expect(fmt.fact({ value: 12400, unit: 'count', label: 'Members' })).toBe('12,400')
  })
})

describe('compactParts', () => {
  test('exposes the rounding fmt.round prints', () => {
    expect(compactParts(1427455.89)).toEqual({ mantissa: 1.4, scale: 'M' })
    expect(compactParts(34164.77)).toEqual({ mantissa: 34, scale: 'K' })
    expect(compactParts(950.4)).toEqual({ mantissa: 950, scale: null })
  })
})
