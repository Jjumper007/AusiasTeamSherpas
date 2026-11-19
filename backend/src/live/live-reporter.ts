import type { LiveJobEvent } from '../api/live-types'
import type { StepId, StepStatus } from '../api/types'
import { isFinalEvent, type Job, type JobStore } from '../jobs/job-store'
import { STEP_LABEL } from '../pipeline/run-job'
import { SCENE_COUNT } from './scene-count'

/**
 * What the wait shows during a Live run: the normal steps and labels (STEP_LABEL), and a bar that moves
 * with real events: each scene of the script resolved, then each voice recorded. It reaches 1 at
 * `live-ready`; chapters and the CTA do not count, as the video does not wait for them.
 */

/** Share of the bar once the brief and facts are written (~0.1 s). */
const BRIEF_SHARE = 0.04
/** Scenes arrive over ~3–14 s, the voices over ~7–18 s: about half the bar each. */
const SCENE_SHARE = 0.48
/** The last step, validating the props and sending `live-ready`, takes the bar to 1. */
const READY_SHARE = 0.02
const VOICE_SHARE = 1 - BRIEF_SHARE - SCENE_SHARE - READY_SHARE
const READY_LABEL = 'Your video is ready'

export interface LiveReporter {
  readonly emit: (event: LiveJobEvent) => void
  readonly step: (id: StepId, status: StepStatus, note?: string) => void
  readonly briefDone: () => void
  readonly sceneResolved: () => void
  readonly voicesRecorded: (count: number) => void
  /** The last tick before `live-ready`. */
  readonly ready: () => void
}

/** Where the bar is after `scenes` resolved scenes and `voices` recorded voices, and what it says. */
export const liveProgress = (scenes: number, voices: number): { readonly progress: number; readonly label: string } => ({
  progress: BRIEF_SHARE + (SCENE_SHARE * scenes) / SCENE_COUNT + (VOICE_SHARE * voices) / SCENE_COUNT,
  label: scenes < SCENE_COUNT ? STEP_LABEL.script : STEP_LABEL.voice,
})

export const createLiveReporter = (job: Pick<Job<LiveJobEvent>, 'id'>, store: JobStore<LiveJobEvent>): LiveReporter => {
  let finished = false
  /** Nothing is sent after `done`, `end` or `error`: e.g. the script step closing after a voice failed the run. */
  const emit = (event: LiveJobEvent): void => {
    if (finished) return
    finished = isFinalEvent(event)
    store.emit(job.id, event)
  }
  let scenes = 0
  let voices = 0
  let last = 0

  /** Only ticks that move the bar forward are sent. */
  const tick = (progress: number, label: string): void => {
    if (progress <= last) return
    last = progress
    emit({ type: 'progress', progress, label })
  }
  const update = (): void => {
    const { progress, label } = liveProgress(scenes, voices)
    tick(progress, label)
  }

  return {
    emit,
    step: (id, status, note) => emit({ type: 'step', step: id, label: STEP_LABEL[id], status, ...(note ? { note } : {}) }),
    briefDone: update,
    sceneResolved: () => {
      scenes = Math.min(SCENE_COUNT, scenes + 1)
      update()
    },
    voicesRecorded: (count) => {
      voices = Math.min(SCENE_COUNT, count)
      update()
    },
    ready: () => tick(1, READY_LABEL),
  }
}
