import { SurveySchema, type Survey } from '@sherpas/shared'
import { BriefError, describeIssues } from './errors'

/** Validates survey answers coming from outside (CLI flags, a JSON file, the web). */
export const parseSurveyInput = (input: unknown): Survey => {
  const result = SurveySchema.safeParse(input)
  if (!result.success) {
    throw new BriefError(`Invalid survey: ${describeIssues(result.error.issues)}`)
  }
  return result.data
}
