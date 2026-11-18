import { describe, expect, test } from 'vitest'
import { FactsSchema, type Facts } from '@sherpas/shared'
import { listCaseIds } from './case-loader'
import { generateFacts } from './facts'
import { parseDisplayNumber } from './facts/curated-facts'
import { toConstantName } from './facts/fact-builders'
import { renderFactsSource } from './facts-source'

const valueOf = (facts: Facts, name: string): number | undefined => facts[name]?.value

describe('generateFacts', () => {
  test.each(listCaseIds())('produces schema-valid facts for %s', (caseId) => {
    const facts = generateFacts(caseId)

    expect(FactsSchema.safeParse(facts).success).toBe(true)
    expect(Object.keys(facts).length).toBeGreaterThan(30)
  })

  test('uses exact, unrounded values from the plan for Daniel and Emily', () => {
    const facts = generateFacts('daniel-emily-johnson')

    expect(facts.SCORE_NOW).toEqual({
      value: 52,
      unit: 'points',
      label: 'Financial health score today, out of 100',
    })
    expect(valueOf(facts, 'RETIREMENT_GAP')).toBe(1427455.89)
    expect(valueOf(facts, 'RETIREMENT_EXTRA_SAVING_PER_YEAR')).toBe(34164.77)
    expect(valueOf(facts, 'RETIREMENT_SPENDING_NEED_PER_YEAR')).toBe(124070.59)
    expect(valueOf(facts, 'SAVINGS_LEFT_AT_PLAN_END')).toBe(260272.08)
    expect(valueOf(facts, 'FREE_CASH_FLOW_PER_YEAR')).toBe(15032.01)
    expect(valueOf(facts, 'DANIEL_LIFE_COVER')).toBe(250000)
    expect(valueOf(facts, 'DANIEL_LIFE_COVER_RECOMMENDED_MIN')).toBe(1600000)
    expect(valueOf(facts, 'EMILY_LIFE_COVER_SHORTFALL')).toBe(1000000)
    expect(valueOf(facts, 'UMBRELLA_COVER_RECOMMENDED')).toBe(1000000)
    expect(valueOf(facts, 'EDUCATION_FUNDING_GAP')).toBe(106552.38)
    expect(valueOf(facts, 'CASH_GAP_TO_TARGET')).toBe(92360)
  })

  test('stores percentages as exact fractions, not the rounded display string', () => {
    const facts = generateFacts('daniel-emily-johnson')

    expect(facts.RETIREMENT_INCOME_SHARE_OF_NEED).toMatchObject({ value: 0.4928, unit: 'percent' })
    expect(facts.RETIREMENT_WITHDRAWAL_RATE_AVERAGE).toMatchObject({ value: 0.0549, unit: 'percent' })
    expect(facts.DEBT_TO_INCOME).toMatchObject({ value: 0.2323, unit: 'percent' })
    expect(facts.CREDIT_CARD_INTEREST_RATE).toMatchObject({ value: 0.249, unit: 'percent' })
  })

  test('separates calendar years from durations and ages', () => {
    const facts = generateFacts('daniel-emily-johnson')

    expect(facts.RETIREMENT_YEAR).toMatchObject({ value: 2044, unit: 'calendar_year' })
    expect(facts.YEARS_TO_RETIREMENT).toMatchObject({ value: 17, unit: 'years' })
    expect(facts.DANIEL_RETIREMENT_AGE).toMatchObject({ value: 62, unit: 'years' })
    expect(facts.EMILY_RETIREMENT_AGE).toMatchObject({ value: 60, unit: 'years' })
    expect(facts.OLIVER_AGE).toMatchObject({ value: 11, unit: 'years' })
    expect(facts.PLAN_END_AGE).toMatchObject({ value: 91, unit: 'years' })
  })

  test('names every score the top moves reach, alone and combined', () => {
    const facts = generateFacts('daniel-emily-johnson')

    expect(valueOf(facts, 'SCORE_AFTER_RAISE_MORTALITY_COVERAGE')).toBe(57)
    expect(valueOf(facts, 'SCORE_AFTER_ADD_UMBRELLA_COVER')).toBe(56)
    expect(valueOf(facts, 'SCORE_AFTER_RAISE_ANNUAL_SAVINGS')).toBe(55)
    expect(valueOf(facts, 'SCORE_AFTER_RAISE_MORTALITY_COVERAGE_AND_ADD_UMBRELLA_COVER')).toBe(60)
    expect(valueOf(facts, 'SCORE_AFTER_ADD_UMBRELLA_COVER_AND_RAISE_ANNUAL_SAVINGS')).toBe(59)
  })

  test('names the dollar amounts quoted in each top move action', () => {
    const facts = generateFacts('daniel-emily-johnson')

    expect(facts.RAISE_MORTALITY_COVERAGE_AMOUNT).toMatchObject({ value: 1166000, unit: 'usd' })
    expect(facts.ADD_UMBRELLA_COVER_AMOUNT).toMatchObject({ value: 1000000, unit: 'usd' })
  })

  test('covers the five pillars with points and maximum points', () => {
    const facts = generateFacts('michael-carter')

    expect(facts.PILLAR_SAVINGS_AND_CASH_FLOW_POINTS).toMatchObject({ value: 0, unit: 'points' })
    expect(facts.PILLAR_SAVINGS_AND_CASH_FLOW_MAX_POINTS).toMatchObject({ value: 25, unit: 'points' })
    expect(facts.PILLAR_INSURANCE_AND_PROTECTION_POINTS).toMatchObject({ value: 4, unit: 'points' })
  })

  test('uses exact values for a single adult with a home purchase and no college (Michael)', () => {
    const facts = generateFacts('michael-carter')

    expect(valueOf(facts, 'SCORE_NOW')).toBe(26)
    expect(valueOf(facts, 'RETIREMENT_GAP')).toBe(1177585.95)
    expect(valueOf(facts, 'FREE_CASH_FLOW_PER_YEAR')).toBe(-8336)
    expect(valueOf(facts, 'RETIREMENT_INCOME_SHARE_OF_NEED')).toBe(0.335)
    expect(valueOf(facts, 'MICHAEL_LIFE_COVER_SHORTFALL')).toBe(720000)
    expect(valueOf(facts, 'SAVINGS_RUN_OUT_AGE')).toBe(85)
    expect(valueOf(facts, 'RETIREMENT_SPENDING_UNPAID')).toBe(32439.08)
    expect(valueOf(facts, 'GOAL_REAL_ESTATE_PURCHASE_AMOUNT')).toBe(550000)
    expect(facts.HOME_PURCHASE_YEAR).toMatchObject({ value: 2027, unit: 'calendar_year' })
    expect(valueOf(facts, 'HOME_DOWN_PAYMENT')).toBe(113300)
    expect(valueOf(facts, 'CASH_MONTHS_COVERED')).toBe(3.2)
  })

  test('leaves out facts for things the case does not have', () => {
    const michael = generateFacts('michael-carter')
    const samantha = generateFacts('samantha-lewis')

    expect(Object.keys(michael).filter((name) => name.includes('EDUCATION') || name.includes('COLLEGE'))).toEqual([])
    expect(Object.keys(michael).filter((name) => name.includes('CO_CLIENT'))).toEqual([])
    expect(samantha).not.toHaveProperty('CREDIT_CARD_BALANCE')
    expect(samantha).not.toHaveProperty('RETIREMENT_GAP')
    expect(generateFacts('daniel-emily-johnson')).not.toHaveProperty('HOME_PURCHASE_YEAR')
  })

  test('gives every fact a non-empty label and a finite value', () => {
    listCaseIds().forEach((caseId) => {
      Object.entries(generateFacts(caseId)).forEach(([name, fact]) => {
        expect(fact.label.length, name).toBeGreaterThan(0)
        expect(Number.isFinite(fact.value), name).toBe(true)
      })
    })
  })

  test('throws on an unknown case', () => {
    expect(() => generateFacts('nobody')).toThrow(/Unknown case "nobody"/)
  })
})

describe('fact helpers', () => {
  test('toConstantName builds SCREAMING_SNAKE_CASE from free text and camelCase', () => {
    expect(toConstantName('Raise mortality coverage')).toBe('RAISE_MORTALITY_COVERAGE')
    expect(toConstantName('savingsLeftAtPlanEnd')).toBe('SAVINGS_LEFT_AT_PLAN_END')
    expect(toConstantName("Daniel's 401(k)")).toBe('DANIELS_401_K')
  })

  test('parseDisplayNumber reads display strings as exact numbers', () => {
    expect(parseDisplayNumber(19000)).toBe(19000)
    expect(parseDisplayNumber('1.4')).toBe(1.4)
    expect(parseDisplayNumber('49%')).toBe(0.49)
    expect(parseDisplayNumber('5.5%')).toBe(0.055)
    expect(parseDisplayNumber('Not applicable')).toBeUndefined()
  })
})

describe('renderFactsSource', () => {
  const facts: Facts = {
    SCORE_NOW: { value: 52, unit: 'points', label: 'Financial health score today, out of 100' },
    FREE_CASH_FLOW_PER_YEAR: { value: -8336, unit: 'usd', label: "Money left over each year, in today's dollars" },
    RETIREMENT_INCOME_SHARE_OF_NEED: { value: 0.4928, unit: 'percent', label: 'Share of "need" covered' },
  }

  test('exports one named constant per fact with its exact value', () => {
    const source = renderFactsSource(facts)

    expect(source).toContain('export const SCORE_NOW = 52\n')
    expect(source).toContain('export const FREE_CASH_FLOW_PER_YEAR = -8336\n')
    expect(source).toContain('export const RETIREMENT_INCOME_SHARE_OF_NEED = 0.4928\n')
  })

  test('also exports the full Facts object so units are available at runtime', () => {
    const source = renderFactsSource(facts)

    expect(source).toContain("import type { Facts } from '@sherpas/shared'")
    expect(source).toContain('export const FACTS = {')
    expect(source).toContain('SCORE_NOW: { value: SCORE_NOW, unit: "points", label: "Financial health score today, out of 100" },')
    expect(source).toContain('label: "Share of \\"need\\" covered"')
    expect(source).toContain('} satisfies Facts')
  })

  test('declares exactly the constants in the facts, for a real case', () => {
    const caseFacts = generateFacts('timothy-melanie-weah')

    const declared = [...renderFactsSource(caseFacts).matchAll(/^export const ([A-Z0-9_]+) = (-?[\d.e+-]+)$/gm)].map(
      (match) => [match[1], Number(match[2])],
    )

    expect(declared).toEqual(Object.entries(caseFacts).map(([name, fact]) => [name, fact.value]))
  })
})
