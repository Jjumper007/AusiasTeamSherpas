/// <reference types="node" />
import { readFileSync } from 'node:fs'
import type { Brief, Facts, Scene, Script } from '@sherpas/shared'
import type { RunFolder } from '../pipeline/run-folder'
import type { RunClaude } from '../script/claude-cli'
import { MAX_NARRATION_WORDS } from '../script/script-check'
import { fillScriptPrompt, promptVersion } from '../script/script-prompt'
import { PROMPT_FILE, SYSTEM_PROMPT } from '../script/write-script'
import type { LiveLog } from './live-log'
import { createScriptExtractor, type ExtractedPart } from './script-extractor'
import { createScriptBoard, type PageSources, type ScriptBoard } from './script-board'
import { resolveChapter, resolveCta, resolveScene } from './script-parts'
import { SCENE_COUNT } from './scene-count'

/**
 * The Live run's script (docs/specs/live-run.md, "Script by streaming"): the same prompt (plus the hook
 * reminder at its end) and system prompt as the normal script, Sonnet, read while Claude writes it.
 * Each part is checked as it closes and handed over at once (accepted or replaced); whatever has not closed when the stream ends, dies or
 * reaches the limit is replaced by the same part of the script without Claude. No retries.
 */

/** Sonnet explicitly, so the timing does not depend on the CLI's default model. */
export const LIVE_SCRIPT_MODEL = 'sonnet'
/**
 * Measured on a real Live run's prompt: at the default effort Sonnet reasons ~16 s before its first
 * text; at `low` it starts writing in under 1 s (whole answer ~10.5 s) and still passes the script checks.
 */
export const LIVE_SCRIPT_EFFORT = 'low'
/** The stream is stopped here: well below the web's 40 s safety net (#16). Sonnet takes ~22 s. */
export const LIVE_SCRIPT_TIMEOUT_MS = 25_000
/** The answer as it streamed, kept for review. */
export const STREAM_FILE = 'script-stream.txt'
const MS_PER_SECOND = 1000

/** The hook length the reminder asks for: below the check's limit (`MAX_HOOK_WORDS`), so a small overshoot still passes. */
export const HOOK_REMINDER_WORDS = 16
/**
 * Appended to the end of the filled script prompt, in the Live run only (prompts/script.md and the normal
 * script are unchanged). Measured: at `--effort low` the hook came out at 21–23 words in 3 of 4 real Live
 * runs and was replaced by the hook without Claude (the Live run never retries); with this reminder at the
 * end of the same prompts, 15–19 words in 6 of 6 calls.
 */
export const HOOK_REMINDER = `Before you answer, count the words of the hook's narration: it must have ${HOOK_REMINDER_WORDS} words or fewer. If it has more, shorten it.`

/** The filled script prompt with the hook reminder as its last paragraph. */
const withHookReminder =(prompt: string): string => `${prompt}\n\n${HOOK_REMINDER}`

export interface StreamScriptInput {
  readonly brief: Brief
  readonly facts: Facts
  readonly folder: Pick<RunFolder, 'writeText'>
  readonly runClaude: RunClaude
  readonly log: LiveLog
  /** The script without Claude: every part that is replaced comes from it. */
  readonly fallback: Script
  /** Called once per scene, as soon as it is accepted or replaced, in the order they close. */
  readonly onScene: (index: number, scene: Scene) => void
  /** Read from prompts/script.md on every run by default, as the normal script does. */
  readonly template?: string
}

export interface StreamedScript {
  /** The script as known now: every resolved part, the rest still from the script without Claude. */
  readonly current: () => Script
  /** Where each chapter and the CTA stand now: what `current()` carries for them (per item). */
  readonly pageSources: () => PageSources
  /** How many parts were replaced by the script without Claude so far, of `partCount`. */
  readonly replacedCount: () => number
  /** Scenes, chapters and the CTA: 11. */
  readonly partCount: number
  /** The final script, once every part is resolved. Never rejects. */
  readonly done: Promise<Script>
}

/** Five scenes, five chapters and the CTA. */
const PART_COUNT = SCENE_COUNT * 2 + 1

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error))
const wordCount = (text: string): number => text.split(/\s+/).filter(Boolean).length

/** Hands each part that closed to the board, checked or replaced. */
const takeInto =
  (board: ScriptBoard, { brief, facts, fallback, log }: StreamScriptInput) =>
  ({ kind, index, text }: ExtractedPart): void => {
    if (kind === 'cta') return board.setCta(resolveCta(text, brief, facts, fallback), 'closed')
    if (index >= SCENE_COUNT) return log(`script: ${kind} ${index + 1} ignored: the video has ${SCENE_COUNT} parts`)
    if (kind === 'scene') return board.setScene(index, resolveScene(index, text, brief, facts, fallback), 'closed')
    return board.setChapter(index, resolveChapter(index, text, facts, fallback), 'closed')
  }

const warnIfLong = (script: Script, log: LiveLog): void => {
  const words = script.scenes.reduce((total, scene) => total + wordCount(scene.narration), 0)
  if (words <= MAX_NARRATION_WORDS) return
  log(`script: warning: the narration has ${words} words in total, over ${MAX_NARRATION_WORDS}; kept, its voices are already recording`)
}

interface StreamReader {
  /** Reads the next streamed text. */
  readonly read: (text: string) => void
  /** Everything streamed so far. */
  readonly streamed: () => string
  readonly closed: () => boolean
}

const createStreamReader = (onPart: (part: ExtractedPart) => void, onClosed: () => void, log: LiveLog): StreamReader => {
  const extractor = createScriptExtractor()
  let streamed = ''
  const read = (text: string): void => {
    if (streamed === '' && text !== '') log('script: first text from Claude')
    streamed += text
    extractor.push(text).forEach(onPart)
    if (extractor.closed()) onClosed()
  }
  return { read, streamed: () => streamed, closed: extractor.closed }
}

/** Asks Claude and reads its stream; `ended` is called when the call settles. Rejects only if reading throws. */
const askClaude = (
  input: StreamScriptInput,
  prompt: string,
  reader: StreamReader,
  ended: (summary: string, why: string) => void,
): Promise<void> =>
  input
    .runClaude(prompt, SYSTEM_PROMPT, { model: LIVE_SCRIPT_MODEL, effort: LIVE_SCRIPT_EFFORT, timeoutMs: LIVE_SCRIPT_TIMEOUT_MS, onText: reader.read })
    .then(
      (answer) => {
        // A CLI that sent no text deltas still answers with the whole text: read what the stream missed.
        if (answer.startsWith(reader.streamed())) reader.read(answer.slice(reader.streamed().length))
        // The CLI answers with the text so far when it is stopped at the limit: the JSON is then left open.
        const summary = reader.closed() ? 'stream ended' : 'stream ended before the answer closed (cut, or stopped at the limit)'
        ended(summary, 'the stream ended without it')
      },
      (error: unknown) => ended(`stream failed: ${errorMessage(error)}`, `Claude call failed: ${errorMessage(error)}`),
    )

export const streamScript = (input: StreamScriptInput): StreamedScript => {
  const { brief, facts, fallback, log } = input
  const template = input.template ?? readFileSync(PROMPT_FILE, 'utf8')
  const prompt = withHookReminder(fillScriptPrompt(template, brief, facts))
  input.folder.writeText('script-prompt.md', prompt)

  const board = createScriptBoard(fallback, log, input.onScene)
  let resolveDone: ((script: Script) => void) | undefined
  const done = new Promise<Script>((resolve) => {
    resolveDone = resolve
  })

  /** Every part still missing comes from the script without Claude; then the script is complete. */
  const finish = (why: string): void => {
    const resolve = resolveDone
    if (!resolve) return
    resolveDone = undefined
    board.fillMissing(why)
    warnIfLong(board.script(), log)
    resolve(board.script())
  }

  const reader = createStreamReader(takeInto(board, input), () => finish('the answer closed without it'), log)
  const ended = (summary: string, why: string): void => {
    input.folder.writeText(STREAM_FILE, reader.streamed())
    log(`script: ${summary} (${reader.streamed().length} characters streamed)`)
    finish(why)
  }

  log(`script: asking Claude (${LIVE_SCRIPT_MODEL}, effort ${LIVE_SCRIPT_EFFORT}, prompt v${promptVersion(template)} + hook reminder, limit ${LIVE_SCRIPT_TIMEOUT_MS / MS_PER_SECOND} s)`)
  askClaude(input, prompt, reader, ended).catch((error: unknown) => {
    log(`script: error while reading the stream: ${errorMessage(error)}`)
    finish(`error while reading the stream: ${errorMessage(error)}`)
  })

  return { current: board.script, pageSources: board.pageSources, replacedCount: board.replacedCount, partCount: PART_COUNT, done }
}
