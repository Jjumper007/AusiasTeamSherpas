import type { Brief, Facts, Survey, SurveyOption } from '@sherpas/shared'
import { buildBrief } from './brief-extractor'
import type { CaseData } from './case-loader'
import { buildFacts } from './facts'
import { renderFactsSource } from './facts-source'
import { buildSurveyOptions } from './survey-options'

/** Everything the pipeline needs from a case for one person, built without an LLM. */
export interface CaseOutputs {
  readonly brief: Brief
  readonly facts: Facts
  /** Source of a `facts.ts` module with one named constant per fact. */
  readonly factsSource: string
  readonly surveyOptions: SurveyOption[]
}

/** Builds the brief, the facts (object and `facts.ts` source) and the survey options for one adult of a loaded case. */
export const generateCaseOutputs = (caseData: CaseData, memberFirstName: string, survey: Survey): CaseOutputs => {
  const facts = buildFacts(caseData)
  return {
    brief: buildBrief(caseData, memberFirstName, survey),
    facts,
    factsSource: renderFactsSource(facts),
    surveyOptions: buildSurveyOptions(caseData),
  }
}
