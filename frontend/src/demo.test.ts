import { describe, expect, it } from 'vitest'
import { demoCases } from './demo'
import type { CaseSummary } from './types'

const johnson: CaseSummary = {
  caseId: 'daniel-emily-johnson',
  family: 'Daniel & Emily',
  score: 52,
  band: 'Fair',
  people: [
    { id: 'daniel', name: 'Daniel' },
    { id: 'emily', name: 'Emily' },
  ],
}
const carter: CaseSummary = { caseId: 'michael-carter', family: 'Michael', score: 26, band: 'Poor', people: [{ id: 'michael', name: 'Michael' }] }

describe('demoCases', () => {
  it('keeps only the adults with a demo video and drops families without any', () => {
    const people = [{ caseId: 'daniel-emily-johnson', member: 'emily' }]

    expect(demoCases([johnson, carter], { demo: true, people })).toEqual([{ ...johnson, people: [{ id: 'emily', name: 'Emily' }] }])
  })

  it('matches people by case as well as by member', () => {
    const people = [{ caseId: 'other-family', member: 'michael' }]

    expect(demoCases([carter], { demo: true, people })).toEqual([])
  })
})
