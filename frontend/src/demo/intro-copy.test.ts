import { describe, expect, it } from 'vitest'
import { memberLine } from './intro-copy'

describe('memberLine', () => {
  it('says how the video explains the plan and what it focuses on, without figures', () => {
    expect(memberLine({ nickname: 'Daniel', explainLevel: 'nerd', topOfMind: 'retirement', decisionStyle: 'research_first' })).toBe(
      'Every number, exact. Focused on retirement.',
    )
    expect(memberLine({ nickname: 'Emily', explainLevel: 'simple', topOfMind: 'protection', decisionStyle: 'ask_trusted' })).toBe(
      'No jargon, fewer numbers. Focused on protecting the family.',
    )
  })
})
