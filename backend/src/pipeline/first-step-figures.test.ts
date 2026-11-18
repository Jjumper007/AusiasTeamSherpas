import type { Facts, TopMove } from '@sherpas/shared'
import { describe, expect, it } from 'vitest'
import { firstStepScore, waitGap } from './first-step-figures'

const lifeMove: TopMove = {
  title: 'Raise mortality coverage',
  action: 'Add $1,166,000 of life cover to reach the next mortality-coverage anchor',
  effort: 'low',
  scoreBefore: 52,
  scoreAfter: 57,
}

const facts: Facts = {
  SCORE_NOW: { value: 52, unit: 'points', label: 'Financial health score today, out of 100' },
  SCORE_AFTER_RAISE_MORTALITY_COVERAGE: { value: 57, unit: 'points', label: 'Score after the move' },
  RAISE_MORTALITY_COVERAGE_AMOUNT: { value: 1166000, unit: 'usd', label: 'Dollar amount in the move' },
  CREDIT_CARD_BALANCE: { value: 18000, unit: 'usd', label: 'Credit card balance today' },
}

const without = (name: string): Facts => Object.fromEntries(Object.entries(facts).filter(([key]) => key !== name))

describe('firstStepScore', () => {
  it('reads the score today and after the move from the facts, formatted', () => {
    expect(firstStepScore(lifeMove, facts)).toEqual({ now: '52', after: '57' })
  })

  it('ignores the numbers on the move itself', () => {
    const tampered = { ...lifeMove, scoreBefore: 1, scoreAfter: 99 }
    expect(firstStepScore(tampered, facts)).toEqual({ now: '52', after: '57' })
  })

  it('is null when the after-score fact is missing', () => {
    expect(firstStepScore(lifeMove, without('SCORE_AFTER_RAISE_MORTALITY_COVERAGE'))).toBeNull()
  })

  it('is null when the score fact is missing', () => {
    expect(firstStepScore(lifeMove, without('SCORE_NOW'))).toBeNull()
  })

  it('is null when the move does not raise the score', () => {
    const flat = { ...facts, SCORE_AFTER_RAISE_MORTALITY_COVERAGE: { ...facts.SCORE_NOW } }
    expect(firstStepScore(lifeMove, flat)).toBeNull()
  })
})

describe('waitGap', () => {
  it("uses the amount in the move's action for life cover", () => {
    expect(waitGap(lifeMove, facts)).toEqual({
      name: 'RAISE_MORTALITY_COVERAGE_AMOUNT',
      label: 'Life cover still missing',
      value: '$1,166,000',
    })
  })

  it('uses the card balance for a card move', () => {
    const cardMove = { ...lifeMove, title: 'Pay down revolving card' }
    expect(waitGap(cardMove, facts)).toEqual({
      name: 'CREDIT_CARD_BALANCE',
      label: 'Card balance still charging interest',
      value: '$18,000',
    })
  })

  it('is null when the matching fact is missing', () => {
    expect(waitGap(lifeMove, without('RAISE_MORTALITY_COVERAGE_AMOUNT'))).toBeNull()
  })

  it('is null when the matching fact is zero', () => {
    const cardMove = { ...lifeMove, title: 'Pay down revolving card' }
    const cleared = { ...facts, CREDIT_CARD_BALANCE: { ...facts.CREDIT_CARD_BALANCE, value: 0 } }
    expect(waitGap(cardMove, cleared)).toBeNull()
  })

  it('is null for a move no fact describes', () => {
    expect(waitGap({ ...lifeMove, title: 'Close a coverage gap' }, facts)).toBeNull()
  })
})
