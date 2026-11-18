import { describe, expect, it } from 'vitest'
import { DONE_TOAST, firstStepCard, REMIND_TOAST, toastFor } from './first-step-card'
import type { DecisionStyle, JobResult } from './types'

const base: JobResult = {
  runId: 'daniel-emily-johnson/emily/2026-11-18T18-01-52-346Z',
  caseId: 'daniel-emily-johnson',
  member: 'emily',
  name: 'Emily',
  partner: 'Daniel',
  survey: { nickname: 'Emily', explainLevel: 'simple', topOfMind: 'protection', decisionStyle: 'ask_trusted' },
  videoUrl: '/runs/daniel-emily-johnson/emily/2026-11-18T18-01-52-346Z/video.mp4',
  durationSec: 75,
  chapters: [],
  cta: { type: 'ask_trusted', text: 'Send this to Daniel and decide together.' },
  // The numbers on the move are deliberately different from the facts: the card must not use them.
  firstStep: { title: 'Raise mortality coverage', action: 'Add $1,166,000 of life cover', effort: 'low', scoreBefore: 1, scoreAfter: 99 },
  firstStepScore: { now: '52', after: '57' },
  waitGap: { name: 'RAISE_MORTALITY_COVERAGE_AMOUNT', label: 'Life cover still missing', value: '$1,166,000' },
  detail: [],
}

const as = (decisionStyle: DecisionStyle, changes: Partial<JobResult> = {}): JobResult => ({
  ...base,
  survey: { ...base.survey, decisionStyle },
  cta: { type: decisionStyle, text: 'From the script.' },
  ...changes,
})

describe('firstStepCard', () => {
  it('puts the step in the heading itself, with no separate label above it', () => {
    expect(firstStepCard(base).heading).toBe('Your first step: Raise mortality coverage')
  })

  it('shows the score change from the facts, not from the move', () => {
    const card = firstStepCard(base)
    expect(card.scoreLine).toBe('Score 52 → 57')
    expect(card.lifts).toBe(true)
  })

  it('says the step closes a gap when it does not lift the score', () => {
    const card = firstStepCard(as('just_do_it', { firstStepScore: null }))
    expect(card.scoreLine).toBe('Closes a gap the plan flags')
    expect(card.lifts).toBe(false)
  })

  it('just_do_it: one big "Start now" button that takes about 10 minutes', () => {
    const card = firstStepCard(as('just_do_it'))
    expect(card.variant).toBe('just_do_it')
    expect(card.primary).toEqual({ kind: 'start', label: 'Start now', pressed: false })
    expect(card.note).toBe('Takes about 10 minutes.')
    expect(card.waitCost).toBeNull()
    expect(card.remindPill).toBe(true)
  })

  it('research_first: no big button, the figures are the action', () => {
    const card = firstStepCard(as('research_first'))
    expect(card.variant).toBe('research_first')
    expect(card.primary).toBeNull()
    expect(card.note).toBeNull()
    expect(card.waitCost).toBeNull()
  })

  it('ask_trusted with a partner: "Send this to <partner>"', () => {
    const card = firstStepCard(as('ask_trusted'))
    expect(card.primary).toEqual({ kind: 'share', label: 'Send this to Daniel', pressed: false })
    expect(card.shareTo).toBe('Daniel')
  })

  it('ask_trusted living alone: "Send this to someone you trust"', () => {
    const card = firstStepCard(as('ask_trusted', { partner: null }))
    expect(card.primary).toEqual({ kind: 'share', label: 'Send this to someone you trust', pressed: false })
    expect(card.shareTo).toBe('someone you trust')
  })

  it('wait with a gap fact: the score it keeps and the gap left open, plus "Remind me"', () => {
    const card = firstStepCard(as('wait'))
    expect(card.waitCost).toEqual({
      score: 'While you wait, your score stays at 52 instead of 57.',
      gap: { name: 'RAISE_MORTALITY_COVERAGE_AMOUNT', label: 'Life cover still missing', value: '$1,166,000' },
    })
    expect(card.primary).toEqual({ kind: 'remind', label: 'Remind me', pressed: false })
    expect(card.remindPill).toBe(false)
  })

  it('wait after "Remind me": the big button shows the reminder is set', () => {
    expect(firstStepCard(as('wait'), 'remind').primary).toEqual({ kind: 'remind', label: 'Reminder set', pressed: true })
  })

  it('wait without a gap fact: only the score sentence', () => {
    const card = firstStepCard(as('wait', { waitGap: null }))
    expect(card.waitCost).toEqual({ score: 'While you wait, your score stays at 52 instead of 57.', gap: null })
  })

  it('wait with no score lift: says waiting leaves the gap open', () => {
    const card = firstStepCard(as('wait', { firstStepScore: null, waitGap: null }))
    expect(card.waitCost?.score).toBe("Waiting leaves the gap open: this step doesn't change the score, but the plan flags it.")
    expect(card.waitCost?.gap).toBeNull()
  })

  it('takes the variant from cta.type', () => {
    const card = firstStepCard({ ...as('wait'), survey: { ...base.survey, decisionStyle: 'just_do_it' } })
    expect(card.variant).toBe('wait')
  })

  it('still renders a result saved before the score and gap fields existed', () => {
    const { firstStepScore: _score, waitGap: _gap, ...old } = as('wait')
    const card = firstStepCard(old as JobResult)
    expect(card.scoreLine).toBe('Closes a gap the plan flags')
    expect(card.waitCost?.gap).toBeNull()
  })
})

describe('toastFor', () => {
  it('confirms "I did it" without metaphors and nudges for "Remind me"', () => {
    expect(toastFor('done')).toBe(DONE_TOAST)
    expect(DONE_TOAST).toBe("Nice. That's your first step done. We'll check in on day 30.")
    expect(toastFor('remind')).toBe(REMIND_TOAST)
  })
})
