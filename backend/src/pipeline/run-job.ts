import { validateNarration, VideoPropsSchema, type Brief, type Facts, type Script } from '@sherpas/shared'
import type { JobEvent, JobRequest, StepId } from '../api/types'
import { loadCase } from '../brief/case-loader'
import { generateCaseOutputs } from '../brief/generate'
import type { Job, JobStore } from '../jobs/job-store'
import { buildFallbackScript } from '../script/fallback-script'
import { estimateSceneTimings } from '../script/scene-timing'
import { findAdult, type Adult } from '../survey/members'
import { resolveSurvey } from '../survey/resolve-survey'
import { buildJobResult } from './job-result'
import type { RenderVideo } from './render-video'
import { createRunFolder, type RunFolder } from './run-folder'

/**
 * The pipeline of one job (SPEC §5), as far as #5 goes:
 *   [1] brief + facts.ts  →  [2] script without Claude  →  [7] render of the fallback video.
 * Voice (#7), Claude's script (#6) and Claude's scenes (#9) plug in between these steps later.
 * Every step is reported over SSE, and everything it produces is written to the run folder.
 */

export interface PipelineDeps {
  readonly store: JobStore
  readonly renderVideo: RenderVideo
  readonly runsDir: string
  readonly now: () => Date
}

const STEP_LABEL: Readonly<Record<StepId, string>> = {
  brief: 'Reading your plan',
  script: 'Writing your script',
  render: 'Rendering your video',
}

/** Where each step sits on the progress bar: rendering is by far the longest. */
const STEP_PROGRESS: Readonly<Record<StepId, readonly [start: number, end: number]>> = {
  brief: [0, 0.05],
  script: [0.05, 0.1],
  render: [0.1, 1],
}

/** Progress ticks closer than this are not sent: the renderer reports every frame. */
const MIN_PROGRESS_STEP = 0.01
const VIDEO_FILE = 'video.mp4'

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

/** Every text of a script that is said or shown: narration, chapters and the call to action. */
const scriptTexts = (script: Script): string[] => [
  ...script.scenes.map((scene) => scene.narration),
  ...script.chapters.flatMap((chapter) => [chapter.title, chapter.body]),
  script.cta.text,
]

/** The number guard (SPEC §5.5): every figure in the script must come from facts. */
const assertFiguresFromFacts = (script: Script, facts: Facts): void => {
  const errors = scriptTexts(script).flatMap((text) => validateNarration(text, facts).errors)
  if (errors.length > 0) throw new Error(errors.map((error) => error.message).join(' '))
}

/** [2] The script without Claude. */
const writeScript = ({ brief, facts, folder }: Inputs): Script => {
  const script = buildFallbackScript(brief, facts)
  assertFiguresFromFacts(script, facts)
  folder.writeJson('script.json', script)
  folder.log('[script] written without Claude from the brief and the facts')
  return script
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

  const step = async <T>(id: StepId, work: () => T | Promise<T>): Promise<T> => {
    emit({ type: 'step', step: id, label: STEP_LABEL[id], status: 'running' })
    progress(id, 0)
    try {
      const output = await work()
      emit({ type: 'step', step: id, label: STEP_LABEL[id], status: 'done' })
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
    const script = await step('script', () => writeScript(inputs))
    const timings = estimateSceneTimings(script)
    const props = VideoPropsSchema.parse({ brief: inputs.brief, script, facts: inputs.facts, scenes: timings })
    folder.writeJson('video-props.json', props)

    await step('render', async () => {
      await deps.renderVideo(props, inputs.folder.path(VIDEO_FILE), (fraction, label) =>
        progress('render', fraction, label),
      )
      inputs.folder.log(`[render] ${VIDEO_FILE} written`)
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
