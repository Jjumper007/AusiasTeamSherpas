/// <reference types="node" />
import { mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Part, VideoProps } from '@sherpas/shared'
import { PROMPTS_DIR, VIDEO_TEMPLATE_DIR } from '../paths'
import type { CheckFrames } from '../pipeline/render-video'
import type { RunFolder } from '../pipeline/run-folder'
import type { ClaudeCallOptions, RunClaude } from '../script/claude-cli'
import { promptVersion } from '../script/prompt-template'
import { checkFrames, durationProblems, numberGuardProblems, runTsc } from './check-scenes'
import { reviewFrames, type ReviewFrame } from './review-frames'
import {
  createSandbox,
  editablePredicate,
  editableSources,
  lockedProblems,
  restoreLocked,
  SANDBOX_DIR,
  snapshotLocked,
  type LockedSnapshot,
} from './sandbox'
import { fillScenesPrompt, SCENE_FILE, scenesRetryPrompt } from './scenes-prompt'
import { reviewScenes, type ReviewResult } from './visual-review'

/**
 * Step [4] of the pipeline (SPEC §5.4–5.6, #9, #10): Claude rewrites the screens of some scenes in
 * an isolated copy of `video-template/`. Each attempt is checked (locked files by hash, number
 * guard, `tsc`, check frames, duration); a rejected attempt is retried with its problems, and after
 * `MAX_ATTEMPTS` the run falls back to the template's own scenes, so a job always gets a video.
 * The attempt that passes gets one visual review round (`visual-review.ts`).
 */

export const MAX_ATTEMPTS = 3
/** One attempt of Claude, tools included. */
export const SCENES_TIMEOUT_MS = 120_000
/**
 * The parts Claude redesigns: what matters most (depth by explain level) and what changes. One
 * scene takes Claude about 45 s, so two fit in one attempt.
 */
export const TARGET_PARTS: readonly Part[] = ['what_matters', 'what_changes']

const PROMPT_FILE = join(PROMPTS_DIR, 'scenes.md')
const SYSTEM_PROMPT =
  'You design and code the screens of a Remotion video. You work only inside the current directory and only on the files you are asked to edit.'
const CLAUDE_TOOLS: Pick<ClaudeCallOptions, 'tools' | 'allowedTools'> = {
  tools: ['Read', 'Write', 'Edit', 'Bash'],
  allowedTools: ['Read', 'Write', 'Edit', 'Bash(npx tsc:*)'],
}
const CHECKS_DIR = 'scenes-check'
const REVIEW_CHECK = 'review'

export type ScenesOutcome =
  | {
      readonly source: 'claude'
      readonly attempts: number
      readonly sandboxDir: string
      readonly serveUrl: string
      /** What the visual review did; absent when it is turned off. */
      readonly review?: ReviewResult
    }
  | { readonly source: 'fallback'; readonly attempts: number; readonly sandboxDir: string }

/** What the pipeline calls; `createScenesWriter` builds the real one, tests pass a fake. */
export type WriteScenes = (
  props: VideoProps,
  folder: RunFolder,
  onAttempt: (attempt: number, maxAttempts: number) => void,
  onReview?: () => void,
) => Promise<ScenesOutcome>

export interface ScenesWriterDeps {
  readonly runClaude: RunClaude
  readonly checkFrames: CheckFrames
  /** `tsc` over the sandbox; the real one by default. */
  readonly typecheck?: (sandboxDir: string) => Promise<string[]>
  readonly templateDir?: string
  /** Read from prompts/scenes.md on every job by default, so prompt edits apply without a restart. */
  readonly template?: string
  /** Read from prompts/visual-review.md on every job by default. */
  readonly reviewTemplate?: string
  readonly parts?: readonly Part[]
  /** The visual review round (#10), on by default; the first thing to cut when short of time. */
  readonly review?: boolean
}

interface AttemptContext {
  readonly props: VideoProps
  readonly folder: RunFolder
  readonly sandboxDir: string
  readonly snapshot: LockedSnapshot
  readonly targetFiles: readonly string[]
  readonly originals: ReadonlyMap<string, string>
  /** The validators' frames: one per scene, plus the visual review's frames of the target scenes. */
  readonly frames: readonly number[]
}

interface AttemptResult {
  readonly problems: readonly string[]
  readonly serveUrl?: string
  readonly stillsDir?: string
}

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error))

/** Runs every validator on the sandbox as Claude left it. Cheap checks first; frames only if they pass. */
const validate = async (context: AttemptContext, deps: ScenesWriterDeps, checkName: string): Promise<AttemptResult> => {
  const { sandboxDir, snapshot, props } = context
  const locked = lockedProblems(sandboxDir, snapshot)
  if (locked.length > 0) restoreLocked(sandboxDir, snapshot)

  const sources = editableSources(sandboxDir, snapshot.isEditable)
  const unchanged = context.targetFiles.every((file) => sources.get(file) === context.originals.get(file))
  const cheap = [
    ...locked,
    ...(unchanged ? ['None of the scene files you were asked to redesign changed.'] : []),
    ...numberGuardProblems(sources, props.facts),
    ...(await (deps.typecheck ?? runTsc)(sandboxDir)),
  ]
  if (cheap.length > 0) return { problems: cheap }

  const stillsDir = context.folder.path(`${CHECKS_DIR}/${checkName}`)
  mkdirSync(stillsDir, { recursive: true })
  try {
    const frames = await deps.checkFrames(sandboxDir, props, context.frames, stillsDir)
    return { problems: [...frames.problems, ...durationProblems(frames.durationSec)], serveUrl: frames.serveUrl, stillsDir }
  } catch (error) {
    return { problems: [`The video failed to bundle or load: ${errorMessage(error).split('\n')[0]}`] }
  }
}

const attemptLog = (answer: string, problems: readonly string[], sources: ReadonlyMap<string, string>): string =>
  [
    answer.trim() || '(no answer)',
    '',
    '--- problems ---',
    ...(problems.length > 0 ? problems : ['none']),
    ...[...sources].flatMap(([file, source]) => ['', `--- ${file} ---`, source]),
  ].join('\n')

interface Passed {
  readonly attempts: number
  readonly serveUrl?: string
  readonly stillsDir?: string
}

const runAttempts = async (
  context: AttemptContext,
  deps: ScenesWriterDeps,
  basePrompt: string,
  onAttempt: (attempt: number, maxAttempts: number) => void,
  attempt = 1,
  prompt = basePrompt,
): Promise<Passed> => {
  onAttempt(attempt, MAX_ATTEMPTS)
  const { answer, callProblem } = await deps
    .runClaude(prompt, SYSTEM_PROMPT, { ...CLAUDE_TOOLS, cwd: context.sandboxDir, timeoutMs: SCENES_TIMEOUT_MS })
    .then((text) => ({ answer: text, callProblem: undefined }))
    .catch((error: unknown) => ({ answer: '', callProblem: `Claude call failed: ${errorMessage(error)}` }))

  // A call cut by the time limit can still have left finished files: they are validated all the same.
  const { problems: found, serveUrl, stillsDir } = await validate(context, deps, `attempt-${attempt}`)
  const problems = found.length > 0 && callProblem ? [callProblem, ...found] : found
  const targets = editableSources(context.sandboxDir, (key) => context.targetFiles.includes(key))
  context.folder.writeText(`scenes-attempt-${attempt}.txt`, attemptLog(answer, problems, targets))
  if (callProblem) context.folder.log(`[scenes] attempt ${attempt}/${MAX_ATTEMPTS}: ${callProblem}`)

  if (problems.length === 0 && serveUrl) return { attempts: attempt, serveUrl, stillsDir }
  context.folder.log(`[scenes] attempt ${attempt}/${MAX_ATTEMPTS} rejected: ${problems.join(' | ')}`)
  if (attempt >= MAX_ATTEMPTS) return { attempts: attempt }
  return runAttempts(context, deps, basePrompt, onAttempt, attempt + 1, scenesRetryPrompt(basePrompt, problems))
}

/** Frames to render once, in order: the validators' per-scene frames and the review's frames. */
const framesToRender = (props: VideoProps, review: readonly ReviewFrame[]): number[] =>
  [...new Set([...checkFrames(props.scenes), ...review.map((frame) => frame.frame)])].sort((a, b) => a - b)

export const createScenesWriter =
  (deps: ScenesWriterDeps): WriteScenes =>
  async (props, folder, onAttempt, onReview) => {
    const parts = deps.parts ?? TARGET_PARTS
    const template = deps.template ?? readFileSync(PROMPT_FILE, 'utf8')
    const sandboxDir = folder.path(SANDBOX_DIR)
    createSandbox(deps.templateDir ?? VIDEO_TEMPLATE_DIR, sandboxDir, props)

    const targetFiles = parts.map((part) => SCENE_FILE[part])
    const snapshot = snapshotLocked(sandboxDir, editablePredicate(targetFiles))
    const originals = editableSources(sandboxDir, (key) => targetFiles.includes(key))
    const prompt = fillScenesPrompt(template, props, parts)
    folder.writeText('scenes-prompt.md', prompt)

    const reviewing = deps.review ?? true
    const review = reviewing ? reviewFrames(props, parts) : []
    const frames = framesToRender(props, review)
    const context: AttemptContext = { props, folder, sandboxDir, snapshot, targetFiles, originals, frames }
    const { attempts, serveUrl, stillsDir } = await runAttempts(context, deps, prompt, onAttempt)
    if (!serveUrl) {
      folder.log(`[scenes] Claude failed ${MAX_ATTEMPTS} times; rendering the template's own scenes`)
      return { source: 'fallback', attempts, sandboxDir }
    }
    folder.log(`[scenes] ${parts.join(', ')} written by Claude (prompt v${promptVersion(template)}, attempt ${attempts}/${MAX_ATTEMPTS})`)
    if (!reviewing || !stillsDir) return { source: 'claude', attempts, sandboxDir, serveUrl }

    onReview?.()
    const reviewed = await reviewScenes({
      runClaude: deps.runClaude,
      systemPrompt: SYSTEM_PROMPT,
      callOptions: CLAUDE_TOOLS,
      props,
      parts,
      folder,
      sandboxDir,
      isEditable: snapshot.isEditable,
      stillsDir,
      frames: review,
      serveUrl,
      revalidate: () => validate(context, deps, REVIEW_CHECK),
      template: deps.reviewTemplate,
    })
    return { source: 'claude', attempts, sandboxDir, serveUrl: reviewed.serveUrl, review: reviewed.result }
  }
