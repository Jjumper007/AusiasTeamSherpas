import { VideoPropsSchema, type Brief, type Facts } from '@sherpas/shared'
import type { JobEvent, JobRequest, StepId } from '../api/types'
import { loadCase } from '../brief/case-loader'
import { generateCaseOutputs } from '../brief/generate'
import type { Job, JobStore } from '../jobs/job-store'
import type { RunClaude } from '../script/claude-cli'
import { writeScript } from '../script/write-script'
import { findAdult, type Adult } from '../survey/members'
import { resolveSurvey } from '../survey/resolve-survey'
import type { Narrate } from '../voice/narrate'
import type { WriteScenes } from '../scenes/write-scenes'
import { buildJobResult } from './job-result'
import type { RenderVideo } from './render-video'
import { createRunFolder, type RunFolder } from './run-folder'

/**
 * The pipeline of one job (SPEC §5):
 *   [1] brief + facts.ts  →  [2] script by Claude (or without Claude)  →  [3] voice and captions
 *   →  [4–6] scenes by Claude in a copy of the template, validated (or the template's own scenes)
 *   →  [7] render.
 * Every step is reported over SSE, and everything it produces is written to the run folder.
 */

export interface PipelineDeps {
  readonly store: JobStore
  readonly narrate: Narrate
  readonly renderVideo: RenderVideo
  /** `claude -p` for the script (#6); a fake in tests. */
  readonly runClaude: RunClaude
  /** Claude's scenes in a copy of the template (#9); a fake in tests. */
  readonly writeScenes: WriteScenes
  readonly runsDir: string
  readonly now: () => Date
}

export const STEP_LABEL: Readonly<Record<StepId, string>> = {
  brief: 'Reading your plan',
  script: 'Writing your script',
  voice: 'Recording the narration',
  scenes: 'Designing your scenes',
  render: 'Rendering your video',
}

/**
 * Where each step sits on the progress bar, roughly by time: script ~25 s, voice ~10 s, scenes
 * ~90 s plus ~90 s of visual review, render ~50 s.
 */
const STEP_PROGRESS: Readonly<Record<StepId, readonly [start: number, end: number]>> = {
  brief: [0, 0.02],
  script: [0.02, 0.12],
  voice: [0.12, 0.16],
  scenes: [0.16, 0.8],
  render: [0.8, 1],
}

/** Progress ticks closer than this are not sent: the renderer reports every frame. */
const MIN_PROGRESS_STEP = 0.01
const VIDEO_FILE = 'video.mp4'
/** Shown on the progress bar and in the step's note when Claude's scenes fail every attempt. */
const FALLBACK_SCENES_NOTE = 'Using the standard scenes'
/** The scenes passed their checks; Claude now looks at their frames (#10). */
export const REVIEW_LABEL = 'Checking how your scenes look'
/** Where the visual review starts within the scenes step, by time. */
const REVIEW_SHARE = 0.5

interface Inputs {
  readonly adult: Adult
  readonly folder: RunFolder
  readonly brief: Brief
  readonly facts: Facts
}

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error))

/** [1] Validates the request against the case, then writes survey.json, brief.json and facts.ts. */
const prepareInputs = (request: JobRequest, deps: PipelineDeps): Inputs => {
  const caseData = loadCase(request.caseId)
  const adult = findAdult(caseData, request.member)
  const survey = resolveSurvey(caseData, adult, request.answers)
  const outputs = generateCaseOutputs(caseData, adult.firstName, survey)
  const folder = createRunFolder(deps.runsDir, caseData.caseId, adult.id, deps.now())
  folder.writeJson('survey.json', survey)
  folder.writeJson('brief.json', outputs.brief)
  folder.writeText('facts.ts', outputs.factsSource)
  folder.log(`[brief] ${caseData.caseId}/${adult.id}: ${Object.keys(outputs.facts).length} facts`)
  return { adult, folder, brief: outputs.brief, facts: outputs.facts }
}

/** Reports steps and progress of one job, sending only progress ticks that move the bar. */
const createReporter = (job: Job, store: JobStore) => {
  const emit = (event: JobEvent): void => store.emit(job.id, event)
  let lastProgress = -1

  const progress = (step: StepId, fraction: number, label = STEP_LABEL[step]): void => {
    const [start, end] = STEP_PROGRESS[step]
    const value = start + (end - start) * Math.min(1, Math.max(0, fraction))
    if (value - lastProgress < MIN_PROGRESS_STEP) return
    lastProgress = value
    emit({ type: 'progress', progress: value, label })
  }

  /** Runs one step; `noteOf` may attach a note to its `done` event (e.g. that a fallback was used). */
  const step = async <T>(id: StepId, work: () => T | Promise<T>, noteOf?: (output: T) => string | undefined): Promise<T> => {
    emit({ type: 'step', step: id, label: STEP_LABEL[id], status: 'running' })
    progress(id, 0)
    try {
      const output = await work()
      const note = noteOf?.(output)
      emit({ type: 'step', step: id, label: STEP_LABEL[id], status: 'done', ...(note ? { note } : {}) })
      return output
    } catch (error) {
      emit({ type: 'step', step: id, label: STEP_LABEL[id], status: 'failed', note: errorMessage(error) })
      throw new Error(`${STEP_LABEL[id]} failed: ${errorMessage(error)}`, { cause: error })
    }
  }

  return { emit, progress, step }
}

/** Runs one job to the end. Never throws: a failure becomes an `error` event and a line in log.txt. */
export const runJob = async (job: Job, deps: PipelineDeps): Promise<void> => {
  const { emit, progress, step } = createReporter(job, deps.store)
  let folder: RunFolder | undefined
  try {
    const inputs = await step('brief', () => prepareInputs(job.request, deps))
    folder = inputs.folder
    const { script } = await step('script', () =>
      writeScript({
        ...inputs,
        runClaude: deps.runClaude,
        onAttempt: (attempt, maxAttempts) => {
          if (attempt > 1) progress('script', (attempt - 1) / maxAttempts, `${STEP_LABEL.script} (try ${attempt} of ${maxAttempts})`)
        },
      }),
    )
    const timings = await step('voice', () =>
      deps.narrate(script, inputs.folder, (fraction) => progress('voice', fraction)),
    )
    const props = VideoPropsSchema.parse({ brief: inputs.brief, script, facts: inputs.facts, scenes: timings })
    folder.writeJson('video-props.json', props)

    const scenes = await step(
      'scenes',
      () =>
        deps.writeScenes(
          props,
          inputs.folder,
          (attempt, maxAttempts) => {
            if (attempt > 1) progress('scenes', (attempt - 1) / maxAttempts, `${STEP_LABEL.scenes} (try ${attempt} of ${maxAttempts})`)
          },
          () => progress('scenes', REVIEW_SHARE, REVIEW_LABEL),
        ),
      (outcome) => (outcome.source === 'fallback' ? FALLBACK_SCENES_NOTE : undefined),
    )
    if (scenes.source === 'fallback') progress('scenes', 1, FALLBACK_SCENES_NOTE)

    await step('render', async () => {
      const serveUrl = scenes.source === 'claude' ? scenes.serveUrl : undefined
      await deps.renderVideo(props, inputs.folder.path(VIDEO_FILE), (fraction, label) => progress('render', fraction, label), {
        serveUrl,
      })
      inputs.folder.log(`[render] ${VIDEO_FILE} written with ${scenes.source === 'claude' ? "Claude's scenes" : 'the standard scenes'}`)
    })

    const result = buildJobResult({
      runId: folder.runId,
      caseId: inputs.brief.caseId,
      member: inputs.adult.id,
      partner: inputs.adult.partner,
      brief: inputs.brief,
      facts: inputs.facts,
      script,
      timings,
      videoUrl: `/runs/${folder.runId}/${VIDEO_FILE}`,
    })
    folder.writeJson('result.json', result)
    emit({ type: 'progress', progress: 1, label: 'Your video is ready' })
    emit({ type: 'done', result })
  } catch (error) {
    const message = errorMessage(error)
    folder?.log(`[error] ${error instanceof Error ? (error.stack ?? message) : message}`)
    console.error(`[job ${job.id}] ${message}`)
    emit({ type: 'error', message })
  }
}
