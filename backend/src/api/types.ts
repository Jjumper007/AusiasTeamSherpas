import type { Cta, Survey, SurveyOption, TopMove } from '@sherpas/shared'

/**
 * The HTTP API between the backend and the web app. The frontend imports these types only
 * (`import type`), so this file must not import anything from Node or the rest of the backend.
 */

/** Survey answers as the web sends them: every question can be skipped (see `resolveSurvey`). */
export type SurveyAnswers = Partial<Survey>

/** One family in the picker (production has a login instead). */
export interface CaseSummary {
  readonly caseId: string
  /** "Daniel & Emily" */
  readonly family: string
  readonly score: number
  readonly band: string
  readonly people: ReadonlyArray<{ readonly id: string; readonly name: string }>
}

/** What the four questions need for one adult. */
export interface SurveyInfo {
  readonly caseId: string
  readonly member: string
  /** First name on the plan. */
  readonly name: string
  readonly partner: string | null
  /** "What's on your mind most?": only topics this plan covers. */
  readonly options: ReadonlyArray<SurveyOption>
  /** The answers used for a skipped question. */
  readonly defaults: Survey
}

/** Body of `POST /api/jobs`. */
export interface JobRequest {
  readonly caseId: string
  readonly member: string
  readonly answers: SurveyAnswers
}

export const STEP_IDS = ['brief', 'script', 'render'] as const
export type StepId = (typeof STEP_IDS)[number]
export type StepStatus = 'running' | 'done' | 'failed'

/** One server-sent event of a job. The SSE event name is `type`. */
export type JobEvent =
  | { readonly type: 'step'; readonly step: StepId; readonly label: string; readonly status: StepStatus; readonly note?: string }
  | { readonly type: 'progress'; readonly progress: number; readonly label: string }
  | { readonly type: 'done'; readonly result: JobResult }
  | { readonly type: 'error'; readonly message: string }

export interface ChapterMark {
  readonly title: string
  readonly body: string
  readonly startSec: number
}

/** A figure behind the video, exact, for "Why this number?". */
export interface FactDetail {
  readonly name: string
  readonly label: string
  readonly value: string
}

/** What the player page needs once the video is rendered. */
export interface JobResult {
  /** runs/ subfolder: "<caseId>/<member>/<timestamp>". */
  readonly runId: string
  readonly caseId: string
  readonly member: string
  /** The nickname, as the video says it. */
  readonly name: string
  readonly partner: string | null
  readonly survey: Survey
  readonly videoUrl: string
  readonly durationSec: number
  readonly chapters: ReadonlyArray<ChapterMark>
  readonly cta: Cta
  readonly firstStep: TopMove
  readonly detail: ReadonlyArray<FactDetail>
}
