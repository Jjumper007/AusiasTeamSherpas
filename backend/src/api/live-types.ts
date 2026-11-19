import type { Cta, Part, Survey, TopMove, VideoProps } from '@sherpas/shared'
import type { ChapterMark, FactDetail, JobEvent, JobResult, ScoreChange } from './types'

/**
 * The Live run's API (docs/specs/live-run.md, "API contract"). Like `types.ts`, the frontend imports
 * these types only, so this file must not import anything from Node or the rest of the backend.
 */

/** Body of `live-ready`: the 5 voices exist, so the video can play; plus what the page already knows. */
export interface LiveReady {
  /** runs/ subfolder: "<caseId>/<member>/<timestamp>". */
  readonly runId: string
  readonly caseId: string
  readonly member: string
  /** The nickname, as the video says it. */
  readonly name: string
  readonly partner: string | null
  readonly survey: Survey
  /** Length of the whole video, opening and closing included. */
  readonly durationSec: number
  readonly firstStep: TopMove
  readonly firstStepScore: ScoreChange | null
  readonly waitGap: FactDetail | null
  /**
   * The complete, validated props of the video, every part on its Standard scene. The narration URLs
   * point at the API (`http://localhost:<API_PORT>/runs/...`), as the MP4 render needs them.
   * Chapters and CTA in it are the final ones when they closed before the last voice; otherwise the
   * script without Claude's, until `page` brings the final ones.
   */
  readonly props: VideoProps
}

/** Body of `page`: what goes under the video once the chapters and the CTA are accepted or replaced. */
export interface LivePage {
  /** One per part, with its start on the video's clock (opening included), from the real voice timings. */
  readonly chapters: ReadonlyArray<ChapterMark>
  readonly cta: Cta
  /** "Why this number?": the facts behind the first step. */
  readonly detail: ReadonlyArray<FactDetail>
}

/** The events a Live run reports over the same SSE route as a normal job (`GET /api/jobs/:id/events`). */
export type LiveJobEvent =
  | Extract<JobEvent, { readonly type: 'step' | 'progress' | 'error' }>
  | { readonly type: 'live-ready'; readonly ready: LiveReady }
  | { readonly type: 'page'; readonly page: LivePage }
  | LiveSceneEvent
  /**
   * The background MP4 (#17) is in the run folder, with its result.json: the last event of a run that
   * kept its video. The server ends the stream and the page closes it; nothing on screen changes.
   */
  | { readonly type: 'done'; readonly result: JobResult }
  /**
   * The run has nothing more to send and keeps no MP4 (its render failed, was cancelled, or the run
   * renders none): the server ends the stream and the page closes it, so it does not reconnect.
   */
  | { readonly type: 'end' }

/**
 * Claude's design of one of parts 3–5 is resolved: `ready` (it passed every check; the page may load
 * its compiled module from `moduleUrl`) or `standard` (the part keeps its Standard scene, and why).
 */
export type LiveSceneEvent =
  | { readonly type: 'scene'; readonly part: Part; readonly status: 'ready'; readonly moduleUrl: string }
  | { readonly type: 'scene'; readonly part: Part; readonly status: 'standard'; readonly reason: string }

/** What the page did with a `scene ready` event, as the run's log tells it. */
export type LiveSceneOutcome =
  /** Swapped in: it was ready at least the margin before its part. */
  | 'swapped'
  /** Kept the Standard scene: ready less than the margin before its part. */
  | 'late'
  /** Kept the Standard scene: its part had already started. */
  | 'started'
  /** Kept the Standard scene: the module could not be loaded. */
  | 'load-failed'
  /** A swapped-in scene threw while drawing: the part went back to its Standard scene. */
  | 'threw'

/** Body of `POST /api/live/jobs/:id/scene`: one decision the page took for a part, for the run's log. */
export interface LiveSceneReport {
  readonly part: Part
  readonly outcome: LiveSceneOutcome
  /** Where the Player's clock was (seconds of the whole video, opening included). */
  readonly videoSec: number
  /** Seconds from that moment to the part's start; negative once the part has started. */
  readonly marginSec: number
  /** The margin a scene needs to be swapped in. */
  readonly neededSec: number
  /** E.g. why the module failed to load. */
  readonly detail?: string
}

/** Body of `POST /api/live/jobs/:id/first-frame`: the browser saw the video start moving. */
export interface FirstFrameReport {
  /** Seconds from sending the survey to the first frame, measured by the browser. */
  readonly browserSec: number
  /** Seconds from `live-ready` reaching the page to the first frame: the wait's exit and the Player's first paint. */
  readonly sinceReadySec?: number
  /** The page had no user activation (e.g. after a reload) and waited for a tap to start with sound. */
  readonly afterTap: boolean
}

export const LIVE_RUN_PLAYING = 'A live run is already playing'
