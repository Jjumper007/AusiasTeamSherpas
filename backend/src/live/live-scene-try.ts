/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { PARTS, VideoPropsSchema, type Part, type VideoProps } from '@sherpas/shared'
import { createRunFolder, type RunFolder } from '../pipeline/run-folder'
import type { ClaudeCallOptions } from '../script/claude-cli'
import { formatSec, liveLog, startClock } from './live-log'
import { LIVE_SCENE_PARTS } from './live-scene-files'
import type { LiveSceneRequest } from './live-scene-prompt'
import { designLiveScene, sceneCallOptions, type SceneStepDeps, type SceneStepResult } from './live-scene-step'

/**
 * Runs the Live run's scene step (#15) on an existing run folder, to iterate on prompts/live-scene.md
 * with real calls but without the voice proxy or a browser (`live-scene-cli.ts`). Each part gets the
 * run's narration, facts and exact duration; the files go to `live-scene-tries/effort-<e>/<timestamp>/`
 * inside the run folder, which must be inside the repo so `tsc` resolves the template's packages.
 */

export const TRIES_DIR = 'live-scene-tries'
export const LIVE_SCENE_USAGE =
  'Usage: npm run live:scene -w backend -- <run folder> [--parts what_matters,first_step,what_changes] [--effort low] [--model sonnet] [--limit 40]'
const MS_PER_SECOND = 1000

export interface LiveSceneTryOptions {
  readonly runDir: string
  readonly parts: readonly Part[]
  readonly call: Pick<ClaudeCallOptions, 'model' | 'effort' | 'timeoutMs'>
}

const flagValue = (argv: readonly string[], flag: string): string | undefined => {
  const at = argv.indexOf(flag)
  return at >= 0 ? argv[at + 1] : undefined
}

const parseParts = (value: string | undefined): readonly Part[] => {
  if (!value) return LIVE_SCENE_PARTS
  const parts = value.split(',').map((part) => part.trim())
  const unknown = parts.filter((part) => !LIVE_SCENE_PARTS.includes(part as Part))
  if (unknown.length > 0) throw new Error(`Unknown parts: ${unknown.join(', ')}. Use: ${LIVE_SCENE_PARTS.join(', ')}`)
  return parts as Part[]
}

const parseLimit = (value: string | undefined): number | undefined => {
  if (value === undefined) return undefined
  const seconds = Number(value)
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error(`--limit must be a number of seconds, got "${value}"`)
  return seconds * MS_PER_SECOND
}

/** The CLI's arguments; `cwd` is where npm was started (a relative run folder is read from there). */
export const parseLiveSceneArgs = (argv: readonly string[], cwd: string): LiveSceneTryOptions => {
  const [runDir] = argv
  if (!runDir || runDir.startsWith('--')) throw new Error(LIVE_SCENE_USAGE)
  const timeoutMs = parseLimit(flagValue(argv, '--limit'))
  const model = flagValue(argv, '--model')
  const effort = flagValue(argv, '--effort')
  return {
    runDir: resolve(cwd, runDir),
    parts: parseParts(flagValue(argv, '--parts')),
    call: { ...(model ? { model } : {}), ...(effort ? { effort } : {}), ...(timeoutMs ? { timeoutMs } : {}) },
  }
}

const requestOf = (props: VideoProps, part: Part): LiveSceneRequest => {
  const index = PARTS.indexOf(part)
  return {
    part,
    brief: props.brief,
    facts: props.facts,
    scene: props.script.scenes[index],
    chapter: props.script.chapters[index],
    cta: props.script.cta,
    durationSec: props.scenes[index].durationSec,
  }
}

const checksLine = (result: SceneStepResult): string =>
  result.checks.map((check) => `${check.name} ${check.problems.length > 0 ? 'FAILED' : 'ok'} ${check.sec.toFixed(2)} s`).join(' · ') ||
  'no checks ran'

/** What the CLI prints for one part: time to the answer, its size, each check, then the module or the reason. */
export const describeTry = (result: SceneStepResult): string[] => {
  const answer = result.answerSec === undefined ? 'no answer' : `answer in ${formatSec(result.answerSec)} s, ${(result.chars ?? 0).toLocaleString('en-US')} characters`
  const head = `${result.part}: ${result.status.toUpperCase()} · ${answer}`
  if (result.status === 'ready') return [head, `  ${checksLine(result)}`, `  module ${result.bytes.toLocaleString('en-US')} B`]
  return [head, `  ${checksLine(result)}`, `  reason: ${result.reason}`, ...result.problems.slice(1).map((problem) => `    ${problem}`)]
}

export interface LiveSceneTry {
  readonly folder: RunFolder
  readonly results: readonly SceneStepResult[]
}

/** Runs the chosen parts in parallel, as a Live run does, and returns where they wrote and how each ended. */
export const tryLiveScenes = async (
  options: LiveSceneTryOptions,
  deps: Omit<SceneStepDeps, 'call'>,
  now: () => Date = () => new Date(),
): Promise<LiveSceneTry> => {
  const props = VideoPropsSchema.parse(JSON.parse(readFileSync(join(options.runDir, 'video-props.json'), 'utf8')))
  const step: SceneStepDeps = { ...deps, call: options.call }
  const folder = createRunFolder(join(options.runDir, TRIES_DIR), `effort-${sceneCallOptions(step).effort}`, sceneCallOptions(step).model ?? 'model', now())
  const clock = startClock(now)
  const context = { folder, log: liveLog(folder, clock), clock }
  const results = await Promise.all(options.parts.map((part) => designLiveScene(requestOf(props, part), step, context)))
  return { folder, results }
}
