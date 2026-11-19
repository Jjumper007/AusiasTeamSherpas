/// <reference types="node" />
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Part } from '@sherpas/shared'
import { PROMPTS_DIR, VIDEO_TEMPLATE_DIR } from '../paths'
import type { RunFolder } from '../pipeline/run-folder'
import type { ClaudeCallOptions, RunClaude } from '../script/claude-cli'
import { promptVersion } from '../script/prompt-template'
import { numberGuardProblems, runTsc } from '../scenes/check-scenes'
import { copyTemplate, lockedProblems, restoreLocked, snapshotLocked, type LockedSnapshot } from '../scenes/sandbox'
import { compileScene, type CompileSceneInput, type CompileSceneResult } from './compile-scene'
import { formatSec, type LiveClock, type LiveLog } from './live-log'
import { liveSceneFiles, type LiveSceneFiles } from './live-scene-files'
import { fillLiveScenePrompt, loadLiveSceneSources, type LiveSceneRequest } from './live-scene-prompt'
import { extractSceneSource } from './scene-answer'
import { sceneComponentName, sceneFileOf } from './scene-module-contract'

/**
 * Claude designs one of parts 3–5 while the video plays (#15, docs/specs/live-run.md): one `claude -p`
 * without tools, its answer is the scene file, written into the part's own copy of the template and
 * checked in order: locked files by hash, number guard, `tsc`, compilation for the browser. The first
 * failure ends it on the Standard scene with a short reason. No retries, no visual review. Never throws.
 */

/** Sonnet explicitly, so the timing does not depend on the CLI's default model. */
export const LIVE_SCENE_MODEL = 'sonnet'
/** Reasoning effort: the script showed ~16 s of reasoning before the first text at the default, ~1 s at `low`. */
export const LIVE_SCENE_EFFORT = 'low'
/**
 * The call is stopped here. Part 3 starts ~40 s after the survey is sent and its call starts at ~9–10 s,
 * so an answer later than ~28 s is too late for it (parts 4 and 5 have ~23 s and ~39 s more).
 */
export const LIVE_SCENE_TIMEOUT_MS = 40_000
export const LIVE_SCENE_SYSTEM_PROMPT =
  'You design and code one scene of a Remotion video. You answer with the complete content of one TSX file and nothing else.'
const PROMPT_FILE = join(PROMPTS_DIR, 'live-scene.md')
const MS_PER_SECOND = 1000
const MAX_LOGGED_PROBLEMS = 10

export interface SceneStepDeps {
  /** `claude -p`; a fake in tests. */
  readonly runClaude: RunClaude
  /** `tsc` over the part's copy; the real one by default. */
  readonly typecheck?: (sandboxDir: string) => Promise<string[]>
  /** The browser module; `compileScene` by default. */
  readonly compile?: (input: CompileSceneInput) => Promise<CompileSceneResult>
  /** Read from prompts/live-scene.md on every part by default, so prompt edits apply without a restart. */
  readonly template?: string
  readonly templateDir?: string
  /** Overrides of the call's model, effort and limit (the CLI's flags). */
  readonly call?: Pick<ClaudeCallOptions, 'model' | 'effort' | 'timeoutMs'>
}

export interface SceneStepContext {
  readonly folder: Pick<RunFolder, 'path' | 'writeText'>
  readonly log: LiveLog
  readonly clock: LiveClock
}

export type CheckName = 'locked files' | 'number guard' | 'tsc' | 'compile'

export interface SceneCheck {
  readonly name: CheckName
  readonly problems: readonly string[]
  readonly sec: number
}

interface StepFacts {
  readonly part: Part
  /** Seconds from asking Claude to its answer; absent when the call failed. */
  readonly answerSec?: number
  readonly chars?: number
  /** The checks that ran, in order; the last one failed when the result is `standard`. */
  readonly checks: readonly SceneCheck[]
}

export type SceneStepResult =
  | (StepFacts & { readonly status: 'ready'; readonly bytes: number })
  | (StepFacts & { readonly status: 'standard'; readonly reason: string; readonly problems: readonly string[] })

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error))
const thousands = (value: number): string => value.toLocaleString('en-US')

/** The call's options: Sonnet, no tools, the limit; the CLI may override model, effort and limit. */
export const sceneCallOptions = (deps: Pick<SceneStepDeps, 'call'>): ClaudeCallOptions => ({
  model: LIVE_SCENE_MODEL,
  effort: LIVE_SCENE_EFFORT,
  timeoutMs: LIVE_SCENE_TIMEOUT_MS,
  ...deps.call,
})

interface Checking {
  readonly part: Part
  readonly request: LiveSceneRequest
  readonly files: LiveSceneFiles
  readonly sandboxDir: string
  readonly snapshot: LockedSnapshot
  readonly source: string
}

type CheckRun = () => Promise<{ readonly problems: readonly string[]; readonly code?: string }>

/** The checks in order: cheapest first, compilation last (it also refuses imports and a missing export). */
const checksFor = (checking: Checking, deps: SceneStepDeps): ReadonlyArray<readonly [CheckName, CheckRun]> => {
  const { sandboxDir, snapshot, files, request } = checking
  return [
    [
      'locked files',
      async () => {
        const problems = lockedProblems(sandboxDir, snapshot)
        if (problems.length > 0) restoreLocked(sandboxDir, snapshot)
        return { problems }
      },
    ],
    ['number guard', async () => ({ problems: numberGuardProblems(new Map([[files.sceneFile, checking.source]]), request.facts) })],
    ['tsc', async () => ({ problems: await (deps.typecheck ?? runTsc)(sandboxDir) })],
    [
      'compile',
      async () => {
        const result = await (deps.compile ?? compileScene)({ srcDir: join(sandboxDir, 'src'), sceneFile: sceneFileOf(checking.part) })
        return result.ok ? { problems: [], code: result.code } : { problems: result.problems }
      },
    ],
  ]
}

/** Runs the checks until one fails; the compiled module when every one passed. */
const runChecks = async (checking: Checking, deps: SceneStepDeps): Promise<{ readonly checks: SceneCheck[]; readonly code?: string }> => {
  let checks: SceneCheck[] = []
  for (const [name, run] of checksFor(checking, deps)) {
    const started = performance.now()
    const { problems, code } = await run()
    checks = [...checks, { name, problems, sec: (performance.now() - started) / MS_PER_SECOND }]
    if (problems.length > 0) return { checks }
    if (code !== undefined) return { checks, code }
  }
  return { checks }
}

/** "tsc failed: src/scenes/X.tsx(3,5): error TS2322: … (and 2 more)": the first problem says enough. */
const reasonOf = (check: SceneCheck): string => {
  const [first = 'failed', ...rest] = check.problems
  const more = rest.length > 0 ? ` (and ${rest.length} more)` : ''
  return `${check.name} failed: ${first.replace(/^TypeScript: /, '')}${more}`
}

const standard = (facts: StepFacts, reason: string, problems: readonly string[] = []): SceneStepResult => ({
  ...facts,
  status: 'standard',
  reason,
  problems,
})

/** Asks Claude; the answer, or why there is none. */
const ask = async (prompt: string, deps: SceneStepDeps): Promise<{ readonly answer: string } | { readonly failed: string }> => {
  try {
    return { answer: await deps.runClaude(prompt, LIVE_SCENE_SYSTEM_PROMPT, sceneCallOptions(deps)) }
  } catch (error) {
    return { failed: `Claude call failed: ${errorMessage(error)}` }
  }
}

/** Checks the source in the part's copy; on success saves the module and the accepted source. */
const checkAndSave = async (checking: Checking, deps: SceneStepDeps, context: SceneStepContext, facts: StepFacts): Promise<SceneStepResult> => {
  writeFileSync(join(checking.sandboxDir, checking.files.sceneFile), checking.source)
  const { checks, code } = await runChecks(checking, deps)
  const done = { ...facts, checks }
  const failed = checks.find((check) => check.problems.length > 0)
  if (failed || code === undefined) return standard(done, failed ? reasonOf(failed) : 'compile failed: no module', failed?.problems)
  // The module first: a source in the folder means the part was accepted (`acceptedLiveScenes`).
  context.folder.writeText(checking.files.module, code)
  context.folder.writeText(checking.files.source, checking.source)
  const sec = checks.reduce((total, check) => total + check.sec, 0)
  const bytes = Buffer.byteLength(code)
  context.log(`scene ${checking.part}: checks passed in ${formatSec(sec)} s (${checks.map((check) => check.name).join(', ')} ${thousands(bytes)} B)`)
  return { ...done, status: 'ready', bytes }
}

const logResult = (result: SceneStepResult, log: LiveLog): void => {
  if (result.status === 'ready') return log(`scene ${result.part}: ready`)
  log(`scene ${result.part}: standard: ${result.reason}`)
  result.problems.slice(1, MAX_LOGGED_PROBLEMS).forEach((problem) => log(`scene ${result.part}:   ${problem}`))
}

/** The prompt, the part's copy and its locked snapshot, then Claude's answer and the checks. */
const design = async (request: LiveSceneRequest, deps: SceneStepDeps, context: SceneStepContext): Promise<SceneStepResult> => {
  const { part } = request
  const files = liveSceneFiles(part)
  const templateDir = deps.templateDir ?? VIDEO_TEMPLATE_DIR
  const template = deps.template ?? readFileSync(PROMPT_FILE, 'utf8')
  const prompt = fillLiveScenePrompt(template, request, loadLiveSceneSources(templateDir))
  context.folder.writeText(files.prompt, prompt)
  // The copy is made while nothing waits on it: Claude takes seconds, this takes milliseconds.
  const sandboxDir = context.folder.path(files.sandbox)
  copyTemplate(templateDir, sandboxDir)
  const snapshot = snapshotLocked(sandboxDir, (key) => key === files.sceneFile)

  const options = sceneCallOptions(deps)
  const limitSec = (options.timeoutMs ?? LIVE_SCENE_TIMEOUT_MS) / MS_PER_SECOND
  context.log(
    `scene ${part}: asking Claude (${options.model}, effort ${options.effort}, prompt v${promptVersion(template)}, limit ${limitSec} s; part about ${formatSec(request.durationSec)} s)`,
  )
  const startedAt = context.clock.elapsedSec()
  const asked = await ask(prompt, deps)
  if ('failed' in asked) return standard({ part, checks: [] }, asked.failed)

  const facts: StepFacts = { part, answerSec: context.clock.elapsedSec() - startedAt, chars: asked.answer.length, checks: [] }
  context.folder.writeText(files.answer, asked.answer)
  context.log(`scene ${part}: answer in ${formatSec(facts.answerSec ?? 0)} s (${thousands(asked.answer.length)} characters)`)
  const extracted = extractSceneSource(asked.answer, sceneComponentName(part))
  if (!extracted.ok) return standard(facts, extracted.reason)
  return checkAndSave({ part, request, files, sandboxDir, snapshot, source: extracted.source }, deps, context, facts)
}

/** Designs one part and logs how it ended. Never throws: anything unexpected ends on the Standard scene. */
export const designLiveScene = async (request: LiveSceneRequest, deps: SceneStepDeps, context: SceneStepContext): Promise<SceneStepResult> => {
  const result = await design(request, deps, context).catch((error: unknown) =>
    standard({ part: request.part, checks: [] }, `the scene could not be checked: ${errorMessage(error)}`),
  )
  logResult(result, context.log)
  return result
}
