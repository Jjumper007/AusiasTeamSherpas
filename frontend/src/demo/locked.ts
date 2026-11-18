// The demo's survey: every question shows all its answers, but only the demo answer can be picked,
// because the demo plays a video made earlier for exactly those answers.
import type { Survey } from '../types'

export type PageId = 'name' | 'explain' | 'worry' | 'decision'

/** Shown on every answer the demo has no video for. */
export const NOT_IN_DEMO = 'Not in this demo'

const FIELD: Readonly<Record<PageId, keyof Survey>> = {
  name: 'nickname',
  explain: 'explainLevel',
  worry: 'topOfMind',
  decision: 'decisionStyle',
}

/** The demo answer of a question. */
export const lockedAnswer = (page: PageId, locked: Survey): string => locked[FIELD[page]]

/** Whether an answer can be picked: any of them outside the demo, only the demo answer in it. */
export const isOffered = (page: PageId, value: string, locked: Survey | undefined): boolean =>
  !locked || lockedAnswer(page, locked) === value
