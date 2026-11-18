import type { Facts } from '@sherpas/shared'
import { describe, expect, test } from 'vitest'
import { pillarScores, pointsFacts, sceneFacts } from './scene-facts'

const facts: Facts = {
  SCORE_NOW: { value: 52, unit: 'points', label: 'Score today' },
  SCORE_AFTER_MOVE: { value: 57, unit: 'points', label: 'Score after the first move' },
  RETIREMENT_GAP: { value: 1427455.89, unit: 'usd', label: 'Retirement gap' },
}

describe('sceneFacts', () => {
  test('returns the facts a scene declares, in the order it declares them', () => {
    const result = sceneFacts({ factsUsed: ['RETIREMENT_GAP', 'SCORE_NOW'] }, facts)

    expect(result.map((fact) => fact.value)).toEqual([1427455.89, 52])
  })

  test('skips names that are not in the facts', () => {
    const result = sceneFacts({ factsUsed: ['MADE_UP', 'SCORE_NOW'] }, facts)

    expect(result.map((fact) => fact.value)).toEqual([52])
  })
})

describe('pointsFacts', () => {
  test('keeps only score facts, so a scene can read before and after', () => {
    const scene = { factsUsed: ['SCORE_NOW', 'RETIREMENT_GAP', 'SCORE_AFTER_MOVE'] }

    const result = pointsFacts(scene, facts)

    expect(result.map((fact) => fact.value)).toEqual([52, 57])
  })

  test('returns nothing when the scene declares no score facts', () => {
    expect(pointsFacts({ factsUsed: ['RETIREMENT_GAP'] }, facts)).toEqual([])
  })
})

describe('pillarScores', () => {
  const pillarFacts: Facts = {
    PILLAR_DEBT_POINTS: { value: 15, unit: 'points', label: 'Debt: points scored today' },
    PILLAR_DEBT_MAX_POINTS: { value: 20, unit: 'points', label: 'Debt: maximum points' },
    PILLAR_INSURANCE_AND_PROTECTION_POINTS: { value: 0, unit: 'points', label: 'Insurance and protection: points scored today' },
  }

  test('pairs the points and the maximum of each area the scene declares, named as the score names it', () => {
    const scene = { factsUsed: ['SCORE_NOW', 'PILLAR_DEBT_POINTS', 'PILLAR_DEBT_MAX_POINTS'] }

    const result = pillarScores(scene, pillarFacts)

    expect(result).toEqual([
      { name: 'Debt', points: pillarFacts.PILLAR_DEBT_POINTS, maxPoints: pillarFacts.PILLAR_DEBT_MAX_POINTS },
    ])
  })

  test('skips an area whose maximum is not declared or does not exist', () => {
    const scene = { factsUsed: ['PILLAR_DEBT_POINTS', 'PILLAR_INSURANCE_AND_PROTECTION_POINTS'] }

    expect(pillarScores(scene, pillarFacts)).toEqual([])
  })
})
