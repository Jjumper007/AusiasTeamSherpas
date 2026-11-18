import { SurveySchema, type Survey, type SurveyOption } from '@sherpas/shared'
import type { CaseData } from '../brief/case-loader'
import { decisionStyleFromPersona } from '../brief/decision-style'
import { BriefError } from '../brief/errors'
import { buildSurveyOptions } from '../brief/survey-options'
import type { Adult } from './members'

/** Survey answers as the web sends them: every question can be skipped. */
export const SurveyAnswersSchema = SurveySchema.partial()
export type SurveyAnswers = ReturnType<typeof SurveyAnswersSchema.parse>

const DEFAULT_EXPLAIN_LEVEL = 'straight'

const firstOption = (caseData: CaseData, options: ReadonlyArray<SurveyOption>): SurveyOption => {
  const [first] = options
  if (!first) throw new BriefError(`Case "${caseData.caseId}" has no topic for "What's on your mind most?"`)
  return first
}

/**
 * Fills the skipped answers with defaults so the pipeline always has a complete survey:
 * - nickname: the first name on the plan;
 * - explain level: `straight`;
 * - top of mind: the first topic the plan covers. A topic the plan does not cover is replaced the same way,
 *   so the video centres on what the plan has (SPEC §3);
 * - decision style: the closest match to persona.md D5. A real answer always wins over D5.
 */
export const resolveSurvey = (caseData: CaseData, adult: Adult, answers: SurveyAnswers): Survey => {
  const options = buildSurveyOptions(caseData)
  const covered = options.some((option) => option.id === answers.topOfMind)
  return SurveySchema.parse({
    nickname: answers.nickname ?? adult.firstName,
    explainLevel: answers.explainLevel ?? DEFAULT_EXPLAIN_LEVEL,
    topOfMind: covered ? answers.topOfMind : firstOption(caseData, options).id,
    decisionStyle: answers.decisionStyle ?? decisionStyleFromPersona(caseData.persona.classification.D5),
  })
}
