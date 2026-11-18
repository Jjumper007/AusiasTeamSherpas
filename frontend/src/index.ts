import { DECISION_STYLES, EXPLAIN_LEVELS } from '@sherpas/shared'

/** Fixed answer ids for the survey form. "What's on your mind most?" options come per case from the backend. */
export const SURVEY_ANSWER_IDS = {
  explainLevel: EXPLAIN_LEVELS,
  decisionStyle: DECISION_STYLES,
} as const
