import { describe, expect, test } from 'vitest'
import { SurveyOptionSchema } from '@sherpas/shared'
import { listCaseIds } from './case-loader'
import { surveyOptionsForCase } from './survey-options'

const topicIds = (caseId: string): string[] => surveyOptionsForCase(caseId).map((option) => option.id)

describe('surveyOptionsForCase', () => {
  test.each(listCaseIds())('returns schema-valid, unique options for %s', (caseId) => {
    const options = surveyOptionsForCase(caseId)

    options.forEach((option) => expect(SurveyOptionSchema.safeParse(option).success).toBe(true))
    expect(new Set(options.map((option) => option.id)).size).toBe(options.length)
    expect(options.length).toBeGreaterThanOrEqual(3)
  })

  test('Daniel and Emily have college and no home purchase', () => {
    expect(topicIds('daniel-emily-johnson')).toEqual(['retirement', 'college', 'emergency_fund', 'debt', 'protection'])
  })

  test('Michael has a home purchase and no college', () => {
    expect(topicIds('michael-carter')).toEqual([
      'retirement',
      'emergency_fund',
      'debt',
      'protection',
      'home_purchase',
      'investments',
    ])
  })

  test('Samantha has no debt topic because she carries no debt', () => {
    expect(topicIds('samantha-lewis')).toEqual([
      'retirement',
      'college',
      'emergency_fund',
      'protection',
      'home_purchase',
      'investments',
    ])
  })

  test('Timothy and Melanie have no emergency fund topic because their cash is not a concern', () => {
    expect(topicIds('timothy-melanie-weah')).toEqual([
      'retirement',
      'college',
      'debt',
      'protection',
      'home_purchase',
      'investments',
    ])
  })

  test('labels are plain language and name the children for college', () => {
    const labels = Object.fromEntries(surveyOptionsForCase('daniel-emily-johnson').map((o) => [o.id, o.label]))

    expect(labels.college).toBe('Paying for college for Oliver and Sophia')
    expect(labels.retirement).toBe('Being able to retire when I plan to')
    expect(labels.protection).toBe('Protecting my family if something happens to me')
  })

  test('a single adult without children gets a protection label about themselves', () => {
    const labels = Object.fromEntries(surveyOptionsForCase('michael-carter').map((o) => [o.id, o.label]))

    expect(labels.protection).toBe('Being covered if something goes wrong')
    expect(labels.home_purchase).toBe('Buying a home')
  })

  test('throws on an unknown case', () => {
    expect(() => surveyOptionsForCase('nobody')).toThrow(/Unknown case "nobody"/)
  })
})
