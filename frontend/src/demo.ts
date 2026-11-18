// The demo (npm run demo) plays videos made earlier: the picker only offers the people who have one.
import type { CaseSummary, DemoInfo } from './types'

export const NOT_DEMO: DemoInfo = { demo: false, people: [] }
export const DEMO_PERSONALIZE_TITLE = 'This demo plays videos made earlier, so the questions are off'
export const NO_DEMO_VIDEOS = 'No demo videos yet. Add one with: npm run demo:add -w backend -- <run folder>'

/** The families and adults that have a demo video; families with none are left out. */
export const demoCases = (cases: CaseSummary[], { people }: DemoInfo): CaseSummary[] =>
  cases
    .map((c) => ({ ...c, people: c.people.filter((p) => people.some((d) => d.caseId === c.caseId && d.member === p.id)) }))
    .filter((c) => c.people.length > 0)
