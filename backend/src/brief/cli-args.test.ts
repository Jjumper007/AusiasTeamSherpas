import { describe, expect, test } from 'vitest'
import { parseCliArgs, resolveSurvey } from './cli-args'

const SURVEY_OPTIONS = [
  { id: 'retirement', label: 'Being able to retire when I plan to' },
  { id: 'debt', label: 'Getting my debt under control' },
] as const

describe('parseCliArgs', () => {
  test('reads case, member and survey flags', () => {
    const args = parseCliArgs([
      'daniel-emily-johnson',
      'Daniel',
      '--nickname',
      'Dan',
      '--explain-level',
      'nerd',
      '--top-of-mind',
      'retirement',
      '--decision-style',
      'wait',
      '--out',
      '/tmp/out',
    ])

    expect(args).toEqual({
      caseId: 'daniel-emily-johnson',
      member: 'Daniel',
      surveyPath: undefined,
      surveyFlags: { nickname: 'Dan', explainLevel: 'nerd', topOfMind: 'retirement', decisionStyle: 'wait' },
      outDir: '/tmp/out',
    })
  })

  test('reads a survey JSON path as the third positional argument', () => {
    const args = parseCliArgs(['michael-carter', 'Michael', './survey.json'])

    expect(args.surveyPath).toBe('./survey.json')
    expect(args.surveyFlags).toEqual({})
  })

  test('throws a usage error when the case or the member is missing', () => {
    expect(() => parseCliArgs([])).toThrow(/Usage:/)
    expect(() => parseCliArgs(['michael-carter'])).toThrow(/Usage:/)
  })

  test('throws on an unknown flag', () => {
    expect(() => parseCliArgs(['michael-carter', 'Michael', '--colour', 'red'])).toThrow(/Usage:/)
  })

  test('refuses a survey file combined with survey flags', () => {
    expect(() => parseCliArgs(['michael-carter', 'Michael', 's.json', '--nickname', 'Mike'])).toThrow(
      /either a survey JSON path or survey flags/,
    )
  })
})

describe('resolveSurvey', () => {
  test('fills unanswered questions with defaults: member name, straight talk, first topic, research first', () => {
    expect(resolveSurvey({}, 'Daniel', SURVEY_OPTIONS)).toEqual({
      nickname: 'Daniel',
      explainLevel: 'straight',
      topOfMind: 'retirement',
      decisionStyle: 'research_first',
    })
  })

  test('keeps the answers that were given', () => {
    expect(resolveSurvey({ nickname: 'Dan', topOfMind: 'debt' }, 'Daniel', SURVEY_OPTIONS)).toMatchObject({
      nickname: 'Dan',
      topOfMind: 'debt',
    })
  })

  test('rejects an invalid answer and names the allowed values', () => {
    expect(() => resolveSurvey({ explainLevel: 'loud' }, 'Daniel', SURVEY_OPTIONS)).toThrow(
      /Invalid survey.*explainLevel/s,
    )
  })
})
