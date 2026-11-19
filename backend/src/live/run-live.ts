import { VideoPropsSchema, type Script, type VideoProps } from '@sherpas/shared'
import type { LiveJobEvent, LivePage, LiveReady } from '../api/live-types'
import type { Job, JobStore } from '../jobs/job-store'
import { buildJobResult } from '../pipeline/job-result'
import { prepareInputs, STEP_LABEL, type Inputs } from '../pipeline/run-job'
import type { RunClaude } from '../script/claude-cli'
import { buildFallbackScript } from '../script/fallback-script'
import { figureProblems } from '../script/script-check'
import type { RecordScene, VoicedScene } from '../voice/narrate'
import { durationWarnings, sceneDurations } from '../voice/scene-durations'
import { createBrowserVerdicts, type BrowserVerdicts } from './browser-verdicts'
import { formatSec, liveLog, startClock, type LiveClock, type LiveLog } from './live-log'
import { renderLiveMp4, RESULT_FILE, VIDEO_FILE, type LiveMp4Deps } from './live-mp4'
import { createLiveReporter, type LiveReporter } from './live-reporter'
import { createLiveScenes, type LiveScenes } from './live-scenes'
import type { SceneStepDeps } from './live-scene-step'
import { createVoiceBoard, type VoiceBoard } from './live-voices'
import { streamScript, type StreamedScript } from './stream-script'
import { describePageSources } from './script-board'

/**
 * One Live run (docs/specs/live-run.md): brief and facts → the script by streaming, each narration
 * recorded as soon as it is accepted or replaced → `live-ready` with the 5 voices → `page` with the
 * chapters, CTA and "Why this number?" → `end`. With `scenes`, Claude designs parts 3–5 meanwhile and
 * `end` waits for their three `scene` events (#15); without it every part plays its Standard scene (#14).
 * With `mp4`, the MP4 is then rendered in the background (#17) and the run ends with `done` when it is
 * kept, or with `end` when it is not (cancelled because the page closed, or failed).
 * Never throws: a failure becomes an `error` event and a line in log.txt.
 */

export interface LiveDeps {
  readonly store: JobStore<LiveJobEvent>
  /** `claude -p` with streaming; a fake in tests. */
  readonly runClaude: RunClaude
  /** Records one scene's narration; a fake in tests. */
  readonly recordScene: RecordScene
  readonly runsDir: string
  /** The clock of the run folder's name and of every elapsed time in the log. */
  readonly now: () => Date
  /** prompts/script.md by default. */
  readonly template?: string
  /** Claude's scenes for parts 3–5 (#15); none when absent. */
  readonly scenes?: SceneStepDeps
  /** The background MP4 (#17); none when absent, and the run ends with `end` once its scenes are resolved. */
  readonly mp4?: LiveMp4Deps
}

export interface LiveRunOptions {
  /** Aborted when the page goes away: the run stops waiting and sends nothing more, and its MP4 is cancelled. */
  readonly signal?: AbortSignal
  /** The run's log, once its folder exists: the first frame the browser reports is written with it. */
  readonly onLog?: (log: LiveLog) => void
  /** What the page did with each Claude scene: the MP4 leaves out the ones it refused (#17). */
  readonly browser?: BrowserVerdicts
}

/** The page closed its stream before the work was done. */
class PageGoneError extends Error {
  constructor() {
    super('The page closed before the video was ready')
  }
}

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error))

/** Waits for `work`, unless the page goes away first. */
const unlessGone = <T>(work: Promise<T>, signal: AbortSignal | undefined): Promise<T> => {
  if (!signal) return work
  if (signal.aborted) return Promise.reject(new PageGoneError())
  return new Promise<T>((resolve, reject) => {
    const gone = (): void => reject(new PageGoneError())
    signal.addEventListener('abort', gone, { once: true })
    work.then(resolve, reject).finally(() => signal.removeEventListener('abort', gone))
  })
}

/** The script without Claude must pass the number guard itself, as `writeScript` requires. */
const checkedFallback = (inputs: Inputs): Script => {
  const script = buildFallbackScript(inputs.brief, inputs.facts)
  const problems = figureProblems(script, inputs.facts)
  if (problems.length > 0) throw new Error(problems.join(' '))
  return script
}

/** The five scene timings from the five voices, with the same duration rules as the narrator. */
const timingsOf = (voiced: readonly VoicedScene[], log: LiveLog): VideoProps['scenes'] => {
  const durations = sceneDurations(voiced.map((scene) => scene.audioSec))
  const cached = voiced.filter((scene) => scene.fromCache).length
  log(`voice: all ${voiced.length} recorded: ${cached} from cache, ${voiced.length - cached} from the proxy`)
  durationWarnings(durations).forEach((warning) => log(`voice: warning: ${warning}`))
  return VideoPropsSchema.shape.scenes.parse(
    voiced.map((scene, index) => ({ durationSec: durations[index], audioFile: scene.audioFile, captions: scene.captions })),
  )
}

const resultOf = (inputs: Inputs, script: Script, timings: VideoProps['scenes']) =>
  buildJobResult({
    runId: inputs.folder.runId,
    caseId: inputs.brief.caseId,
    member: inputs.adult.id,
    partner: inputs.adult.partner,
    brief: inputs.brief,
    facts: inputs.facts,
    script,
    timings,
    videoUrl: '',
  })

const readyOf = (inputs: Inputs, props: VideoProps): LiveReady => {
  const { runId, caseId, member, name, partner, survey, durationSec, firstStep, firstStepScore, waitGap } = resultOf(
    inputs,
    props.script,
    props.scenes,
  )
  return { runId, caseId, member, name, partner, survey, durationSec, firstStep, firstStepScore, waitGap, props }
}

const pageOf = (inputs: Inputs, script: Script, timings: VideoProps['scenes']): LivePage => {
  const { chapters, cta, detail } = resultOf(inputs, script, timings)
  return { chapters, cta, detail }
}

/** Starts the script and records each scene as it is resolved. */
const startScriptAndVoices = (
  inputs: Inputs,
  deps: LiveDeps,
  report: LiveReporter,
  log: LiveLog,
  voices: VoiceBoard,
  scenes: LiveScenes | undefined,
): StreamedScript => {
  let voiceStarted = false
  report.step('script', 'running')
  const script = streamScript({
    brief: inputs.brief,
    facts: inputs.facts,
    folder: inputs.folder,
    runClaude: deps.runClaude,
    log,
    fallback: checkedFallback(inputs),
    template: deps.template,
    onScene: (index, scene) => {
      report.sceneResolved()
      if (!voiceStarted) report.step('voice', 'running')
      voiceStarted = true
      voices.record(index, scene.narration)
      scenes?.scriptScene(index, scene, () => script.current())
    },
  })
  script.done
    .then(() => {
      const replaced = script.replacedCount()
      report.step('script', 'done', replaced > 0 ? `${replaced} of ${script.partCount} parts written without Claude` : undefined)
      // In the normal pipeline's format too: `demo:add` reads the steps' ends from these lines for its replay.
      inputs.folder.log(`[script] live: ${replaced} of ${script.partCount} parts written without Claude`)
    })
    .catch((error: unknown) => log(`script: could not finish: ${errorMessage(error)}`))
  return script
}

/** Waits for the five voices; a voice that fails fails the run, at the voice step. */
const awaitVoices = async (voices: VoiceBoard, report: LiveReporter, signal: AbortSignal | undefined): Promise<VoicedScene[]> => {
  try {
    const voiced = await unlessGone(voices.all, signal)
    report.step('voice', 'done')
    return voiced
  } catch (error) {
    if (error instanceof PageGoneError) throw error
    report.step('voice', 'failed', errorMessage(error))
    throw new Error(`${STEP_LABEL.voice} failed: ${errorMessage(error)}`, { cause: error })
  }
}

const prepare = (job: Job<LiveJobEvent>, deps: LiveDeps, report: LiveReporter): Inputs => {
  report.step('brief', 'running')
  try {
    const inputs = prepareInputs(job.request, deps)
    report.step('brief', 'done')
    report.briefDone()
    return inputs
  } catch (error) {
    report.step('brief', 'failed', errorMessage(error))
    throw new Error(`${STEP_LABEL.brief} failed: ${errorMessage(error)}`, { cause: error })
  }
}

interface Playing {
  readonly voices: VoiceBoard
  readonly scenes?: LiveScenes
  readonly signal?: AbortSignal
}

/** The work after the folder exists: script and voices, `live-ready`, `page`, then Claude's scenes. Resolves with the final props. */
const play = async (
  inputs: Inputs,
  deps: LiveDeps,
  report: LiveReporter,
  log: LiveLog,
  { voices, scenes, signal }: Playing,
): Promise<VideoProps> => {
  const script = startScriptAndVoices(inputs, deps, report, log, voices, scenes)
  const timings = timingsOf(await awaitVoices(voices, report, signal), log)
  const props = VideoPropsSchema.parse({ brief: inputs.brief, script: script.current(), facts: inputs.facts, scenes: timings })
  const ready = readyOf(inputs, props)
  report.ready()
  report.emit({ type: 'live-ready', ready })
  // The props carry each chapter and the CTA as resolved at this moment, item by item (`script.current()`).
  log(`live-ready (video ${formatSec(ready.durationSec)} s; in it: ${describePageSources(script.pageSources())})`)

  const final = await unlessGone(script.done, signal)
  const finalProps = VideoPropsSchema.parse({ ...props, script: final })
  inputs.folder.writeJson('script.json', final)
  inputs.folder.writeJson('video-props.json', finalProps)
  report.emit({ type: 'page', page: pageOf(inputs, final, timings) })
  log('page sent (chapters, CTA, "Why this number?")')
  if (!scenes) return finalProps
  const resolved = await unlessGone(scenes.all, signal)
  const summary = resolved.map((result) => `${result.part} ${result.status}`).join(', ')
  log(`scenes: all ${resolved.length} resolved: ${summary}`)
  inputs.folder.log(`[scenes] live: ${summary}`)
  return finalProps
}

interface Finishing {
  readonly inputs: Inputs
  readonly props: VideoProps
  readonly log: LiveLog
  readonly clock: LiveClock
}

/** After the scenes: the MP4 in the background when the run has one, then the last event. */
const finish = async (deps: LiveDeps, report: LiveReporter, options: LiveRunOptions, { inputs, props, log, clock }: Finishing) => {
  if (!deps.mp4) {
    report.emit({ type: 'end' })
    log('end: nothing more to send')
    return
  }
  const browser = options.browser ?? createBrowserVerdicts()
  const { adult, folder } = inputs
  const input = { folder, props, member: adult.id, partner: adult.partner, log, clock, browser, signal: options.signal }
  const outcome = await renderLiveMp4(input, deps.mp4)
  if (outcome.status === 'kept') {
    report.emit({ type: 'done', result: outcome.result })
    log(`done: ${VIDEO_FILE} and ${RESULT_FILE} kept`)
    return
  }
  report.emit({ type: 'end' })
  log('end: nothing more to send, no MP4 kept')
}

export const runLiveJob = async (job: Job<LiveJobEvent>, deps: LiveDeps, options: LiveRunOptions = {}): Promise<void> => {
  const clock = startClock(deps.now)
  const report = createLiveReporter(job, deps.store)
  let log: LiveLog | undefined
  let voices: VoiceBoard | undefined
  let scenes: LiveScenes | undefined
  try {
    const inputs = prepare(job, deps, report)
    const runLog = liveLog(inputs.folder, clock)
    log = runLog
    options.onLog?.(runLog)
    runLog(`job ${job.id}: brief and facts written`)
    scenes = deps.scenes
      ? createLiveScenes({ step: deps.scenes, brief: inputs.brief, facts: inputs.facts, folder: inputs.folder, log: runLog, clock, emit: report.emit })
      : undefined
    voices = createVoiceBoard({
      recordScene: scenes ? scenes.recordingWith(deps.recordScene) : deps.recordScene,
      folder: inputs.folder,
      log: runLog,
      clock,
      onRecorded: report.voicesRecorded,
    })
    const props = await play(inputs, deps, report, runLog, { voices, scenes, signal: options.signal })
    await finish(deps, report, options, { inputs, props, log: runLog, clock })
  } catch (error) {
    voices?.stop()
    scenes?.stop()
    const message = errorMessage(error)
    log?.(`error: ${error instanceof Error ? (error.stack ?? message) : message}`)
    console.error(`[live job ${job.id}] ${message}`)
    report.emit({ type: 'error', message })
  }
}
