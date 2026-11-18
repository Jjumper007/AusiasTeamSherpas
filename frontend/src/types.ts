// The API's shapes come from the backend (types only: nothing from the backend reaches the browser).
import type { SurveyAnswers } from '@sherpas/backend/src/api/types'

export type {
  CaseSummary,
  ChapterMark,
  FactDetail,
  JobEvent,
  JobResult,
  SurveyAnswers,
  SurveyInfo,
} from '@sherpas/backend/src/api/types'
export type { DecisionStyle, ExplainLevel, TopicId } from '@sherpas/shared'

/** What the survey screen keeps: the answers it sends, plus "Something else" in the person's own words. */
export interface Answers extends SurveyAnswers {
  /** Not sent: the video only covers what the plan covers (SPEC §3), so the backend picks the topic. */
  otherTopic?: string
}

/** The latest progress tick of a job. */
export interface Progress {
  progress: number
  label: string
}
