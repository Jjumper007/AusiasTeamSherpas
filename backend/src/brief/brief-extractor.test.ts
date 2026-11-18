import { describe, expect, test } from 'vitest'
import { BriefSchema, type Survey } from '@sherpas/shared'
import { briefSizeBytes, extractBrief } from './brief-extractor'
import { loadCase } from './case-loader'
import { overrideD5 } from './decision-style'
import { buildSurveyOptions } from './survey-options'

const MAX_BRIEF_BYTES = 9_500

const ADULTS_BY_CASE: ReadonlyArray<readonly [string, string]> = [
  ['daniel-emily-johnson', 'Daniel'],
  ['daniel-emily-johnson', 'Emily'],
  ['michael-carter', 'Michael'],
  ['samantha-lewis', 'Samantha'],
  ['timothy-melanie-weah', 'Timothy'],
  ['timothy-melanie-weah', 'Melanie'],
]

const survey = (overrides: Partial<Survey> = {}): Survey => ({
  nickname: 'Dan',
  explainLevel: 'nerd',
  topOfMind: 'retirement',
  decisionStyle: 'research_first',
  ...overrides,
})

describe('extractBrief', () => {
  test.each(ADULTS_BY_CASE)('builds a schema-valid brief for %s / %s', (caseId, member) => {
    const brief = extractBrief(caseId, member, survey())

    expect(BriefSchema.safeParse(brief).success).toBe(true)
    expect(brief.caseId).toBe(caseId)
    expect(brief.member.firstName).toBe(member)
  })

  test.each(ADULTS_BY_CASE)('stays within the size budget for every topic the case offers: %s / %s', (caseId, member) => {
    const topics = buildSurveyOptions(loadCase(caseId)).map((option) => option.id)

    const sizes = topics.map((topOfMind) => briefSizeBytes(extractBrief(caseId, member, survey({ topOfMind }))))

    expect(Math.max(...sizes)).toBeLessThanOrEqual(MAX_BRIEF_BYTES)
  })

  test('describes the selected adult, not the other one', () => {
    const emily = extractBrief('daniel-emily-johnson', 'Emily', survey()).member

    expect(emily).toEqual({
      firstName: 'Emily',
      role: 'co-client',
      age: 42,
      retirementAge: 60,
      riskProfile: 'Moderate',
    })
  })

  test('matches the member name case-insensitively', () => {
    expect(extractBrief('michael-carter', 'michael', survey()).member.firstName).toBe('Michael')
  })

  test('keeps children in the household', () => {
    const { household } = extractBrief('daniel-emily-johnson', 'Daniel', survey())

    expect(household).toEqual([
      { firstName: 'Daniel', role: 'client', age: 44 },
      { firstName: 'Emily', role: 'co-client', age: 42 },
      { firstName: 'Oliver', role: 'child', age: 11 },
      { firstName: 'Sophia', role: 'child', age: 9 },
    ])
  })

  test('rejects a child as the selected member and lists the adults', () => {
    expect(() => extractBrief('daniel-emily-johnson', 'Oliver', survey())).toThrow(
      /Oliver is a child.*Daniel, Emily/,
    )
  })

  test('rejects an unknown member and an unknown case', () => {
    expect(() => extractBrief('michael-carter', 'Daniel', survey())).toThrow(/No member named "Daniel".*Michael/)
    expect(() => extractBrief('nobody', 'Daniel', survey())).toThrow(/Unknown case "nobody"/)
    expect(() => extractBrief('../cases/michael-carter', 'Michael', survey())).toThrow(/Unknown case/)
  })

  test('rejects an invalid survey with a clear message', () => {
    const invalid = { ...survey(), decisionStyle: 'flip_a_coin' }

    expect(() => extractBrief('michael-carter', 'Michael', invalid as unknown as Survey)).toThrow(
      /Invalid survey.*decisionStyle/s,
    )
  })

  test('reads score, pillars and top moves from the plan', () => {
    const brief = extractBrief('michael-carter', 'Michael', survey())

    expect(brief.score.value).toBe(26)
    expect(brief.score.band).toBe('critical')
    expect(brief.score.pillars[0]).toEqual({ name: 'Savings and cash flow', points: 0, maxPoints: 25 })
    expect(brief.topMoves).toHaveLength(3)
    expect(brief.topMoves[1]).toEqual({
      title: 'Lower the withdrawal rate',
      action: 'Cutting withdrawals to $10,300/year (6.0%) reaches the sustainable band',
      effort: 'high',
      scoreBefore: 26,
      scoreAfter: 62,
    })
  })

  test('reads goals, telling a home purchase from a vehicle purchase', () => {
    const { goals } = extractBrief('timothy-melanie-weah', 'Melanie', survey())

    expect(goals.map((goal) => goal.type)).toEqual([
      'RETIREMENT',
      'VACATION',
      'COLLEGE',
      'REAL_ESTATE_PURCHASE',
      'VEHICLE_PURCHASE',
    ])
    expect(goals[3]).toEqual({
      type: 'REAL_ESTATE_PURCHASE',
      text: 'Plan to purchase a home for $600,000 in 2030.',
      amount: 600000,
    })
    expect(goals[0]).not.toHaveProperty('amount')
  })

  test('carries concerns and tensions from persona.md', () => {
    const brief = extractBrief('samantha-lewis', 'Samantha', survey())

    expect(brief.concerns).toHaveLength(9)
    expect(brief.tensions.map((tension) => tension.level)).toEqual(['HIGH', 'MEDIUM', 'LOW'])
  })
})

describe('extractBrief: survey decision style overrides D5', () => {
  test('carries the survey answers unchanged', () => {
    const answers = survey({ decisionStyle: 'ask_trusted' })

    expect(extractBrief('daniel-emily-johnson', 'Daniel', answers).survey).toEqual(answers)
  })

  test('replaces the persona D5 with the survey answer and records what it overrode', () => {
    const { classification } = extractBrief('daniel-emily-johnson', 'Daniel', survey({ decisionStyle: 'wait' }))

    expect(classification.D5).toBe('WAIT (survey answer; overrides persona.md D5: DUAL)')
    expect(classification.D6).toBe('PROTECTION')
  })

  test.each([
    ['michael-carter', 'Michael', 'COLLABORATOR'],
    ['samantha-lewis', 'Samantha', 'VALIDATOR'],
  ])('never leaves the bare persona D5 in the brief: %s', (caseId, member, personaD5) => {
    const { classification } = extractBrief(caseId, member, survey({ decisionStyle: 'just_do_it' }))

    expect(classification.D5).not.toBe(personaD5)
    expect(classification.D5.startsWith('JUST_DO_IT')).toBe(true)
    expect(classification.D5).toContain(personaD5)
  })

  test('overrideD5 formats every decision style', () => {
    expect(overrideD5('DUAL', 'research_first')).toBe(
      'RESEARCH_FIRST (survey answer; overrides persona.md D5: DUAL)',
    )
    expect(overrideD5('VALIDATOR', 'ask_trusted')).toBe(
      'ASK_TRUSTED (survey answer; overrides persona.md D5: VALIDATOR)',
    )
  })
})

describe('extractBrief: narrative selection', () => {
  test('always includes the two summary texts', () => {
    const { narrative } = extractBrief('daniel-emily-johnson', 'Daniel', survey({ topOfMind: 'debt' }))

    expect(Object.keys(narrative)).toEqual(expect.arrayContaining(['summary_main', 'summary_recommendations']))
  })

  test('adds the texts for the topic on the member’s mind', () => {
    const retirement = extractBrief('daniel-emily-johnson', 'Daniel', survey({ topOfMind: 'retirement' }))
    const protection = extractBrief('daniel-emily-johnson', 'Daniel', survey({ topOfMind: 'protection' }))

    expect(Object.keys(retirement.narrative)).toContain('retirement_short_observations')
    expect(Object.keys(retirement.narrative)).not.toContain('protection_life_insurance_short_observations')
    expect(Object.keys(protection.narrative)).toContain('protection_life_insurance_short_observations')
    expect(Object.keys(protection.narrative)).not.toContain('retirement_short_observations')
  })

  test('copies narrative text verbatim from the plan', () => {
    const { plan } = loadCase('michael-carter')
    const { narrative } = extractBrief('michael-carter', 'Michael', survey({ topOfMind: 'debt' }))

    expect(narrative.debt_short_observations).toBe(plan.narrative.debt_short_observations)
  })

  test('falls back to the summaries when the plan does not cover the chosen topic', () => {
    const brief = extractBrief('michael-carter', 'Michael', survey({ topOfMind: 'college' }))

    expect(Object.keys(brief.narrative)).toEqual(['summary_main', 'summary_recommendations'])
    expect(brief.survey.topOfMind).toBe('college')
  })
})
