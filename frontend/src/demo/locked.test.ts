import { describe, expect, it } from 'vitest'
import type { Survey } from '@sherpas/shared'
import { isOffered, lockedAnswer } from './locked'

const daniel: Survey = { nickname: 'Daniel', explainLevel: 'nerd', topOfMind: 'retirement', decisionStyle: 'research_first' }

describe('isOffered', () => {
  it('offers every option when the survey is not locked', () => {
    expect(isOffered('explain', 'simple', undefined)).toBe(true)
  })

  it('offers only the demo answer of each question', () => {
    expect(isOffered('explain', 'nerd', daniel)).toBe(true)
    expect(isOffered('explain', 'simple', daniel)).toBe(false)
    expect(isOffered('worry', 'retirement', daniel)).toBe(true)
    expect(isOffered('worry', 'college', daniel)).toBe(false)
    expect(isOffered('decision', 'research_first', daniel)).toBe(true)
    expect(isOffered('decision', 'wait', daniel)).toBe(false)
  })
})

describe('lockedAnswer', () => {
  it('gives the demo answer of each question, the nickname included', () => {
    expect(lockedAnswer('name', daniel)).toBe('Daniel')
    expect(lockedAnswer('worry', daniel)).toBe('retirement')
  })
})
