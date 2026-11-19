/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Brief, Facts, Script } from '@sherpas/shared'
import { PROMPTS_DIR } from '../paths'
import type { RunFolder } from '../pipeline/run-folder'
import type { RunClaude } from './claude-cli'
import { buildFallbackScript } from './fallback-script'
import { checkScript, figureProblems } from './script-check'
import { fillScriptPrompt, promptVersion, retryPrompt } from './script-prompt'

/**
 * Step [2] of the pipeline (SPEC §5.2, §5.6): Claude writes the script, checked with zod and the
 * number guard. A rejected answer is retried with its problems; after `MAX_ATTEMPTS` the script
 * without Claude is used, so a job always has a script.
 */

export const MAX_ATTEMPTS = 3
/** The prompt and system prompt of the script, also used by the Live run's streamed script. */
export const PROMPT_FILE = join(PROMPTS_DIR, 'script.md')
export const SYSTEM_PROMPT =
  'You write short, warm narration scripts for personal financial plan videos. You reply with a single JSON object and nothing else.'

export interface WriteScriptInput {
  readonly brief: Brief
  readonly facts: Facts
  readonly folder: Pick<RunFolder, 'writeText' | 'writeJson' | 'log'>
  readonly runClaude: RunClaude
  /** Called before each attempt, for the progress bar. */
  readonly onAttempt?: (attempt: number, maxAttempts: number) => void
  /** Read from prompts/script.md on every job by default, so prompt edits apply without a restart. */
  readonly template?: string
}

export interface WrittenScript {
  readonly script: Script
  readonly source: 'claude' | 'fallback'
  readonly attempts: number
}

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error))

/** One call to Claude: its answer and problems, or the failure of the call itself. */
const askClaude = async (
  input: WriteScriptInput,
  prompt: string,
): Promise<{ answer: string; check: ReturnType<typeof checkScript> }> => {
  try {
    const answer = await input.runClaude(prompt, SYSTEM_PROMPT)
    return { answer, check: checkScript(answer, input.brief, input.facts) }
  } catch (error) {
    return { answer: '', check: { ok: false, problems: [`Claude call failed: ${errorMessage(error)}`] } }
  }
}

const attemptLog = (answer: string, problems: readonly string[]): string =>
  [answer, '', '--- problems ---', ...(problems.length > 0 ? problems : ['none'])].join('\n')

const tryClaude = async (input: WriteScriptInput, basePrompt: string, attempt: number, prompt: string): Promise<WrittenScript | null> => {
  input.onAttempt?.(attempt, MAX_ATTEMPTS)
  const { answer, check } = await askClaude(input, prompt)
  input.folder.writeText(`script-attempt-${attempt}.txt`, attemptLog(answer, check.ok ? [] : check.problems))
  if (check.ok) return { script: check.script, source: 'claude', attempts: attempt }

  input.folder.log(`[script] attempt ${attempt}/${MAX_ATTEMPTS} rejected: ${check.problems.join(' | ')}`)
  if (attempt >= MAX_ATTEMPTS) return null
  const nextPrompt = answer === '' ? basePrompt : retryPrompt(basePrompt, answer, check.problems)
  return tryClaude(input, basePrompt, attempt + 1, nextPrompt)
}

const fallbackScript = ({ brief, facts }: WriteScriptInput): Script => {
  const script = buildFallbackScript(brief, facts)
  const problems = figureProblems(script, facts)
  if (problems.length > 0) throw new Error(problems.join(' '))
  return script
}

/** Writes script.json (and the prompt and every attempt, for review) to the run folder. */
export const writeScript = async (input: WriteScriptInput): Promise<WrittenScript> => {
  const template = input.template ?? readFileSync(PROMPT_FILE, 'utf8')
  const prompt = fillScriptPrompt(template, input.brief, input.facts)
  input.folder.writeText('script-prompt.md', prompt)

  const written = (await tryClaude(input, prompt, 1, prompt)) ?? {
    script: fallbackScript(input),
    source: 'fallback' as const,
    attempts: MAX_ATTEMPTS,
  }
  input.folder.writeJson('script.json', written.script)
  input.folder.log(
    written.source === 'claude'
      ? `[script] written by Claude (prompt v${promptVersion(template)}, attempt ${written.attempts}/${MAX_ATTEMPTS})`
      : `[script] Claude failed ${MAX_ATTEMPTS} times; written without Claude from the brief and the facts`,
  )
  return written
}
