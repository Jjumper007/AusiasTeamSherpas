import { FactsSchema, type Facts } from '@sherpas/shared'
import { MAX_TOP_MOVES } from '../brief-extractor'
import { loadCase, type CaseData } from '../case-loader'
import { BriefError, describeIssues } from '../errors'
import { curatedFacts } from './curated-facts'
import type { FactEntry } from './fact-builders'
import { goalFacts } from './goal-facts'
import { householdFacts } from './household-facts'
import { planFacts } from './plan-facts'
import { scoreFacts } from './score-facts'

const duplicatedNames = (entries: ReadonlyArray<FactEntry>): string[] => {
  const names = entries.map(([name]) => name)
  return [...new Set(names.filter((name, index) => names.indexOf(name) !== index))]
}

/**
 * Builds every figure a video about this case may say or show, keyed by constant name.
 * Values are exact, as written in the case JSON. Facts are the same for every member of the case.
 */
export const buildFacts = ({ caseId, plan }: CaseData): Facts => {
  const entries = [
    ...scoreFacts(plan, MAX_TOP_MOVES),
    ...householdFacts(plan),
    ...planFacts(plan),
    ...curatedFacts(plan),
    ...goalFacts(plan),
  ]

  const duplicates = duplicatedNames(entries)
  if (duplicates.length > 0) {
    throw new BriefError(`Case "${caseId}" produces the same fact name twice: ${duplicates.join(', ')}`)
  }
  const result = FactsSchema.safeParse(Object.fromEntries(entries))
  if (!result.success) {
    throw new BriefError(`Case "${caseId}" produces invalid facts: ${describeIssues(result.error.issues)}`)
  }
  return result.data
}

/** Loads the case and builds its facts. */
export const generateFacts = (caseId: string): Facts => buildFacts(loadCase(caseId))
