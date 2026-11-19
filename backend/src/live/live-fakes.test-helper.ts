/// <reference types="node" />
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Script } from '@sherpas/shared'
import type { LiveJobEvent } from '../api/live-types'
import type { JobRequest } from '../api/types'
import { loadCase } from '../brief/case-loader'
import { generateCaseOutputs } from '../brief/generate'
import { createJobStore, type JobStore } from '../jobs/job-store'
import type { ClaudeCallOptions, RunClaude } from '../script/claude-cli'
import { buildFallbackScript } from '../script/fallback-script'
import { findAdult } from '../survey/members'
import { resolveSurvey } from '../survey/resolve-survey'
import type { RecordScene } from '../voice/narrate'
import type { SceneStepDeps } from './live-scene-step'
import { runLiveJob } from './run-live'

/** Fakes for the Live run's tests: no Claude, no voice proxy, no real time. */

export const START = new Date('2026-11-19T10:00:00.000Z')
export const RUN_STAMP = '2026-11-19T10-00-00-000Z'
const MS_PER_SECOND = 1000

export const emily: JobRequest = {
  caseId: 'daniel-emily-johnson',
  member: 'emily',
  answers: { explainLevel: 'simple', topOfMind: 'protection', decisionStyle: 'ask_trusted' },
}

/** A clock that only moves when a fake says so. */
export const createFakeClock = () => {
  let ms = 0
  return {
    now: () => new Date(START.getTime() + ms),
    advance: (seconds: number) => {
      ms += seconds * MS_PER_SECOND
    },
  }
}
export type FakeClock = ReturnType<typeof createFakeClock>

const dirs: string[] = []
export const tempRunsDir = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'sherpas-live-'))
  dirs.push(dir)
  return dir
}
export const removeTempDirs = (): void => dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }))

/** Lets pending promise callbacks and timers of zero run. */
export const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

/** The script without Claude for a request, as the run builds it. */
export const fallbackFor = (request: JobRequest): Script => {
  const caseData = loadCase(request.caseId)
  const adult = findAdult(caseData, request.member)
  const outputs = generateCaseOutputs(caseData, adult.firstName, resolveSurvey(caseData, adult, request.answers))
  return buildFallbackScript(outputs.brief, outputs.facts)
}

/** A script that passes every check and differs from the one without Claude in every part. */
export const claudeScriptFor = (fallback: Script): Script => ({
  scenes: fallback.scenes.map((scene, index) => ({
    ...scene,
    narration: index === 0 ? 'Emily, Claude here: your plan in a minute, starting with protecting your family.' : `${scene.narration} Claude wrote this part.`,
    visualIdea: `Claude: ${scene.visualIdea}`,
  })) as Script['scenes'],
  chapters: fallback.chapters.map((chapter, index) => ({ ...chapter, title: `Claude chapter ${index + 1}` })) as Script['chapters'],
  cta: { type: 'ask_trusted', text: 'Show this to Daniel tonight.' },
})

export interface StreamPlan {
  /** Sizes of the text deltas, used in turn. */
  readonly chunkSizes?: readonly number[]
  /** Seconds the fake clock moves before each delta. */
  readonly secPerChunk?: number
  /** Stop after this many characters: the CLI exits with an error (`exit`) or is stopped at the limit (`limit`). */
  readonly stopAt?: { readonly chars: number; readonly as: 'exit' | 'limit' }
  /** Hold the deltas from this character on until the promise `until` gives resolves (called when the hold starts). */
  readonly holdFrom?: { readonly chars: number; readonly until: () => Promise<unknown> }
}

export interface ClaudeCall {
  readonly prompt: string
  readonly systemPrompt: string
  readonly options?: ClaudeCallOptions
}

/** `claude -p` streaming `answer` through `onText`, as the real CLI does, without spending anything. */
export const streamingClaude = (answer: string, clock: FakeClock, plan: StreamPlan = {}) => {
  const calls: ClaudeCall[] = []
  const sizes = plan.chunkSizes ?? [40]
  const runClaude: RunClaude = async (prompt, systemPrompt, options) => {
    calls.push({ prompt, systemPrompt, options })
    const end = plan.stopAt?.chars ?? answer.length
    let streamed = ''
    for (let at = 0, turn = 0; at < end; turn += 1) {
      await Promise.resolve()
      if (plan.holdFrom && at >= plan.holdFrom.chars) await plan.holdFrom.until()
      const piece = answer.slice(at, Math.min(end, at + sizes[turn % sizes.length]))
      clock.advance(plan.secPerChunk ?? 0.2)
      options?.onText?.(piece)
      streamed += piece
      at += piece.length
    }
    if (plan.stopAt?.as === 'exit') throw new Error('claude -p exited with code 1: overloaded')
    return streamed
  }
  return { runClaude, calls }
}

/** A CLI that is not installed. */
export const missingClaude: RunClaude = async () => {
  throw new Error('Could not start "claude" (is Claude Code installed and on PATH?): spawn claude ENOENT')
}

export interface RecordCall {
  readonly index: number
  readonly narration: string
}

/** Records like the narrator (an MP3 in audio/, a URL on the API), 2.5 words a second, without the proxy. */
export const fakeRecorder = (options: { readonly failScene?: number } = {}) => {
  const calls: RecordCall[] = []
  const recordScene: RecordScene = async (narration, index, folder) => {
    calls.push({ index, narration })
    await Promise.resolve()
    if (options.failScene === index) throw new Error('LLM_PROXY_KEY is not set')
    mkdirSync(folder.path('audio'), { recursive: true })
    const fileName = `audio/scene-${index + 1}.mp3`
    writeFileSync(folder.path(fileName), 'mp3')
    const words = narration.split(/\s+/).length
    return {
      audioSec: words / 2.5,
      audioFile: `http://localhost:3016/runs/${folder.runId}/${fileName}`,
      captions: [{ text: narration, startSec: 0, endSec: words / 2.5 }],
      fromCache: false,
    }
  }
  return { recordScene, calls }
}

export interface LiveRunFakes {
  readonly runClaude: RunClaude
  readonly recordScene: RecordScene
  readonly clock: FakeClock
  readonly signal?: AbortSignal
  readonly store?: JobStore<LiveJobEvent>
  /** Claude's scenes for parts 3–5 (#15); none when absent. */
  readonly scenes?: SceneStepDeps
  /** A temporary folder by default. */
  readonly runsDir?: string
}

/** Runs one Live run to its end and returns its events and its run folder. */
export const runLive = async (request: JobRequest, fakes: LiveRunFakes) => {
  const store = fakes.store ?? createJobStore<LiveJobEvent>()
  const runsDir = fakes.runsDir ?? tempRunsDir()
  const job = store.create(request)
  const events: LiveJobEvent[] = []
  store.subscribe(job.id, (event) => events.push(event))
  const deps = { store, runClaude: fakes.runClaude, recordScene: fakes.recordScene, runsDir, now: fakes.clock.now, scenes: fakes.scenes }
  await runLiveJob(job, deps, { signal: fakes.signal })
  await settle()
  const folder = join(runsDir, request.caseId, request.member, RUN_STAMP)
  const read = (file: string): string => readFileSync(join(folder, file), 'utf8')
  return { events, folder, read, job: store.get(job.id) }
}

/** log.txt without the ISO timestamp at the start of each line. */
export const logLines = (log: string): string[] =>
  log
    .trim()
    .split('\n')
    .map((line) => line.replace(/^\S+ /, ''))

export const eventOf = <T extends LiveJobEvent['type']>(events: readonly LiveJobEvent[], type: T) =>
  events.find((event): event is Extract<LiveJobEvent, { type: T }> => event.type === type)
