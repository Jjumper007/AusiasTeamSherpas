import { describe, expect, it } from 'vitest'
import { loadCase } from '../brief/case-loader'
import { decisionStyleFromPersona } from '../brief/decision-style'
import { adultsOf, findAdult } from './members'
import { resolveSurvey, SurveyAnswersSchema } from './resolve-survey'

const johnsons = loadCase('daniel-emily-johnson')
const michael = loadCase('michael-carter')

describe('adultsOf', () => {
  it('lists the two adults of a couple, each with the other as partner', () => {
    expect(adultsOf(johnsons)).toEqual([
      { id: 'daniel', firstName: 'Daniel', partner: 'Emily' },
      { id: 'emily', firstName: 'Emily', partner: 'Daniel' },
    ])
  })

  it('gives a single adult no partner', () => {
    expect(adultsOf(michael)).toEqual([{ id: 'michael', firstName: 'Michael', partner: null }])
  })
})

describe('findAdult', () => {
  it('finds an adult by id or first name', () => {
    expect(findAdult(johnsons, 'emily').firstName).toBe('Emily')
    expect(findAdult(johnsons, 'Emily').id).toBe('emily')
  })

  it('rejects a child with the selectable members in the message', () => {
    expect(() => findAdult(johnsons, 'oliver')).toThrow(/Selectable members: daniel, emily/)
  })
})

describe('resolveSurvey', () => {
  const daniel = findAdult(johnsons, 'daniel')

  it('keeps every answer that was given', () => {
    const answers = {
      nickname: 'Dan',
      explainLevel: 'nerd',
      topOfMind: 'retirement',
      decisionStyle: 'research_first',
    } as const
    expect(resolveSurvey(johnsons, daniel, answers)).toEqual(answers)
  })

  it('fills skipped answers: first name, straight talk, first covered topic, decision style from D5', () => {
    expect(resolveSurvey(johnsons, daniel, {})).toEqual({
      nickname: 'Daniel',
      explainLevel: 'straight',
      topOfMind: 'retirement',
      decisionStyle: 'ask_trusted',
    })
  })

  it('replaces a topic the plan does not cover with the first covered one', () => {
    expect(resolveSurvey(johnsons, daniel, { topOfMind: 'home_purchase' }).topOfMind).toBe('retirement')
  })

  it('rejects answers outside the closed lists', () => {
    expect(SurveyAnswersSchema.safeParse({ explainLevel: 'expert' }).success).toBe(false)
  })
})

describe('decisionStyleFromPersona', () => {
  it.each([
    ['DUAL', 'ask_trusted'],
    ['COLLABORATOR', 'ask_trusted'],
    ['VALIDATOR', 'research_first'],
    ['avoidant', 'wait'],
    ['SOMETHING_NEW', 'just_do_it'],
  ] as const)('maps D5 %s to %s', (d5, expected) => {
    expect(decisionStyleFromPersona(d5)).toBe(expected)
  })
})
