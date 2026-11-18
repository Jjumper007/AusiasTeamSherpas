/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Part, VideoProps } from '@sherpas/shared'
import { PROMPTS_DIR } from '../paths'
import type { RunFolder } from '../pipeline/run-folder'
import type { ClaudeCallOptions, RunClaude } from '../script/claude-cli'
import { promptVersion } from '../script/prompt-template'
import type { ReviewFrame } from './review-frames'
import { changedSources, editableSources, restoreEditableSources } from './sandbox'
import { fillReviewPrompt } from './scenes-prompt'

/**
 * The visual review (SPEC §5.5.5, #10): once an attempt of #9 passes every validator, Claude looks
 * at stills of the scenes it redesigned and fixes what is visibly broken (cut or overlapping text,
 * contrast, empty bars, half-empty screens, unfinished entrances) in the same sandbox. One round,
 * with a short limit. A fix is kept only if every validator passes again; otherwise the editable
 * files go back to how the passing attempt left them and its bundle is rendered. Never throws.
 */

/** One review round of Claude, tools included (the team allows 60–90 s). */
export const REVIEW_TIMEOUT_MS = 75_000
const PROMPT_FILE = join(PROMPTS_DIR, 'visual-review.md')
const LOG_FILE = 'visual-review.txt'
const PROMPT_LOG_FILE = 'visual-review-prompt.md'
const ANSWER_IN_LOG_CHARS = 160

/**
 * - `unchanged`: Claude found nothing to fix (or changed nothing).
 * - `kept`: Claude fixed something and the fix passed every validator.
 * - `reverted`: the fix broke a validator; the passing attempt's files and bundle are used.
 * - `skipped`: no frame to review (the camera never rests on the target screens).
 * - `failed`: the review itself crashed; the passing attempt's files and bundle are used.
 */
export type ReviewResult = 'unchanged' | 'kept' | 'reverted' | 'skipped' | 'failed'

/** What re-running every validator of #9 on the reviewed sandbox gives. */
export interface ReviewCheck {
  readonly problems: readonly string[]
  readonly serveUrl?: string
}

export interface VisualReviewInput {
  readonly runClaude: RunClaude
  readonly systemPrompt: string
  /** The same tools and permissions as the scenes attempts. */
  readonly callOptions: Pick<ClaudeCallOptions, 'tools' | 'allowedTools'>
  readonly props: VideoProps
  readonly parts: readonly Part[]
  readonly folder: RunFolder
  readonly sandboxDir: string
  readonly isEditable: (key: string) => boolean
  /** The stills of the attempt that passed; Claude reads them from this folder. */
  readonly stillsDir: string
  readonly frames: readonly ReviewFrame[]
  /** The bundle of the attempt that passed, kept unless a fix passes every validator again. */
  readonly serveUrl: string
  /** Runs every validator of #9 again on the sandbox. */
  readonly revalidate: () => Promise<ReviewCheck>
  /** Read from prompts/visual-review.md on every job by default. */
  readonly template?: string
}

export interface ReviewOutcome {
  readonly result: ReviewResult
  /** The bundle to render: the fixed one when kept, the passing attempt's otherwise. */
  readonly serveUrl: string
}

interface Settled extends ReviewOutcome {
  readonly problems: readonly string[]
}

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error))

const stillPath = (stillsDir: string, frame: number): string => join(stillsDir, `frame-${frame}.png`)

/** Keeps a fix that passes every validator; otherwise puts the saved sources back. */
const settle = async (input: VisualReviewInput, saved: ReadonlyMap<string, string>, changed: readonly string[]): Promise<Settled> => {
  if (changed.length === 0) return { result: 'unchanged', serveUrl: input.serveUrl, problems: [] }
  const check = await input
    .revalidate()
    .catch((error: unknown): ReviewCheck => ({ problems: [`The validators failed to run: ${errorMessage(error)}`] }))
  if (check.problems.length === 0 && check.serveUrl) return { result: 'kept', serveUrl: check.serveUrl, problems: [] }
  restoreEditableSources(input.sandboxDir, input.isEditable, saved)
  const problems = check.problems.length > 0 ? check.problems : ['The fixed video did not bundle.']
  return { result: 'reverted', serveUrl: input.serveUrl, problems }
}

const reviewLog = (
  version: string,
  answer: string,
  images: readonly string[],
  settled: Settled,
  fixed: ReadonlyMap<string, string>,
): string =>
  [
    `prompt v${version} · limit ${REVIEW_TIMEOUT_MS / 1000} s · result: ${settled.result}`,
    '',
    '--- answer ---',
    answer.trim() || '(no answer)',
    '',
    '--- frames ---',
    ...images,
    '',
    '--- problems after the fix ---',
    ...(settled.problems.length > 0 ? settled.problems : ['none']),
    ...[...fixed].flatMap(([file, source]) => ['', `--- ${file} (as Claude left it) ---`, source]),
  ].join('\n')

const logLine = (settled: Settled, changed: readonly string[], answer: string, version: string): string => {
  // The answer lists every frame, then its verdict on the last line.
  const said = (answer.trim().split('\n').at(-1) ?? '').trim().slice(0, ANSWER_IN_LOG_CHARS)
  switch (settled.result) {
    case 'kept':
      return `[review] kept Claude's visual fixes to ${changed.join(', ')} (prompt v${version}): ${said}`
    case 'reverted':
      return `[review] reverted the visual fixes, they broke a validator: ${settled.problems.join(' | ')}`
    default:
      return `[review] no changes (prompt v${version}): ${said || '(no answer)'}`
  }
}

const review = async (input: VisualReviewInput, saved: ReadonlyMap<string, string>): Promise<ReviewOutcome> => {
  const { folder, sandboxDir, isEditable } = input
  const template = input.template ?? readFileSync(PROMPT_FILE, 'utf8')
  const version = promptVersion(template)
  const images = input.frames.map((frame) => ({ ...frame, image: stillPath(input.stillsDir, frame.frame) }))
  const prompt = fillReviewPrompt(template, input.props, input.parts, images)
  folder.writeText(PROMPT_LOG_FILE, prompt)

  const { answer, callProblem } = await input
    .runClaude(prompt, input.systemPrompt, {
      ...input.callOptions,
      cwd: sandboxDir,
      addDirs: [input.stillsDir],
      timeoutMs: REVIEW_TIMEOUT_MS,
    })
    .then((text) => ({ answer: text, callProblem: undefined }))
    .catch((error: unknown) => ({ answer: '', callProblem: `Claude call failed: ${errorMessage(error)}` }))
  if (callProblem) folder.log(`[review] ${callProblem}`)

  // A call cut by the time limit can still have left a finished fix: it is validated all the same.
  const after = editableSources(sandboxDir, isEditable)
  const changed = changedSources(saved, after)
  const settled = await settle(input, saved, changed)
  const fixed = new Map(changed.flatMap((file) => (after.has(file) ? [[file, after.get(file) ?? ''] as const] : [])))
  folder.writeText(LOG_FILE, reviewLog(version, answer || callProblem || '', images.map((image) => image.image), settled, fixed))
  folder.log(logLine(settled, changed, answer, version))
  return { result: settled.result, serveUrl: settled.serveUrl }
}

/** Runs the one review round. On any crash the passing attempt's files and bundle stay in use. */
export const reviewScenes = async (input: VisualReviewInput): Promise<ReviewOutcome> => {
  if (input.frames.length === 0) {
    input.folder.log('[review] skipped: no frame shows the redesigned screens')
    return { result: 'skipped', serveUrl: input.serveUrl }
  }
  const saved = editableSources(input.sandboxDir, input.isEditable)
  try {
    return await review(input, saved)
  } catch (error) {
    input.folder.log(`[review] failed, keeping the scenes that passed: ${errorMessage(error)}`)
    try {
      restoreEditableSources(input.sandboxDir, input.isEditable, saved)
    } catch (restoreError) {
      // The render uses the passing attempt's bundle, so only the sandbox copy is left as the review left it.
      input.folder.log(`[review] could not restore the sandbox's scene files: ${errorMessage(restoreError)}`)
    }
    return { result: 'failed', serveUrl: input.serveUrl }
  }
}
