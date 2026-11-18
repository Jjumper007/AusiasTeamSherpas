// The words of the survey's answers (SPEC §3), shared by the questions and the demo's intro.
import type { ExplainLevel } from './types'

export const EXPLAIN_TEXT: Readonly<Record<ExplainLevel, { readonly label: string; readonly sub: string }>> = {
  simple: { label: 'Keep it simple', sub: 'No jargon, fewer numbers' },
  straight: { label: 'Straight talk', sub: 'The plan, plainly' },
  nerd: { label: 'Nerd mode', sub: 'Every number, exact' },
}
