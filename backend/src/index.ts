import { SurveySchema, type Survey } from '@sherpas/shared'

/** Validates a survey coming from the web before a job is created. Throws on invalid input. */
export const parseSurvey = (input: unknown): Survey => SurveySchema.parse(input)
