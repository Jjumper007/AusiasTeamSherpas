/// <reference types="node" />
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { StringDecoder } from 'node:string_decoder'
import { z } from 'zod'
import { createStreamReader, type StreamRead } from './claude-stream'

/**
 * How one call may act. By default Claude only answers in text (the script, #6). The scenes step
 * (#9) lets it read, write and type-check files inside a sandbox folder.
 */
export interface ClaudeCallOptions {
  /** Built-in tools Claude can use, e.g. `['Read', 'Write', 'Edit', 'Bash']`. None by default. */
  readonly tools?: readonly string[]
  /** Permission rules that run without asking, e.g. `Bash(npx tsc:*)`. Anything else is denied. */
  readonly allowedTools?: readonly string[]
  /** Working directory of the CLI; also the only folder Claude may write in. A temp folder by default. */
  readonly cwd?: string
  /** Folders outside `cwd` Claude may also read, e.g. the check frames of the visual review (#10). */
  readonly addDirs?: readonly string[]
  readonly timeoutMs?: number
  /** Model alias or name for `--model`, e.g. `sonnet` for the Live run. The CLI's own default when absent. */
  readonly model?: string
  /** Reasoning effort for `--effort` (e.g. `low`). The CLI's own default when absent. */
  readonly effort?: string
  /**
   * Streams the answer: called with each piece of text as it arrives, while the call still resolves
   * with the whole text. If the call is stopped (e.g. by `timeoutMs`) before the CLI's result line,
   * it resolves with the text streamed so far.
   */
  readonly onText?: (text: string) => void
}

/** Sends one prompt to Claude and resolves with its text answer. Injected so tests never call Claude. */
export type RunClaude = (prompt: string, systemPrompt: string, options?: ClaudeCallOptions) => Promise<string>

/** Claude Code CLI, headless (SPEC §5): `claude -p` with the prompt on stdin. */
const CLAUDE_BIN = 'claude'
/** One attempt of the script; Claude usually answers in well under a minute. */
export const CLAUDE_TIMEOUT_MS = 180_000
const MAX_STDERR_CHARS = 500
const MS_PER_SECOND = 1000

const JSON_OUTPUT_ARGS = ['--output-format', 'json'] as const
/** One JSON line per event, text deltas included. `-p` only allows `stream-json` with `--verbose`. */
const STREAM_OUTPUT_ARGS = ['--output-format', 'stream-json', '--include-partial-messages', '--verbose'] as const

/**
 * No MCP servers, no project or user settings (and so no CLAUDE.md or hooks), no saved session.
 * Tools only as the call allows; the text-only default also runs outside the repo for the same reason.
 */
const ISOLATION_ARGS = ['--setting-sources', '', '--strict-mcp-config', '--no-session-persistence'] as const

export const cliArgs = (systemPrompt: string, options: ClaudeCallOptions = {}): string[] => [
  '-p',
  ...(options.onText ? STREAM_OUTPUT_ARGS : JSON_OUTPUT_ARGS),
  ...ISOLATION_ARGS,
  ...(options.model ? ['--model', options.model] : []),
  ...(options.effort ? ['--effort', options.effort] : []),
  '--tools',
  (options.tools ?? []).join(','),
  ...(options.allowedTools && options.allowedTools.length > 0 ? ['--allowedTools', options.allowedTools.join(',')] : []),
  ...(options.addDirs ?? []).flatMap((dir) => ['--add-dir', dir]),
  '--system-prompt',
  systemPrompt,
]

/** The part of `--output-format json` we read. */
const CliResultSchema = z.object({ is_error: z.boolean(), result: z.string() })

/** The text of a result, or the CLI's own message when the result is an error. */
const resultText = (isError: boolean, text: string): string => {
  if (isError) throw new Error(`claude -p failed: ${text.slice(0, MAX_STDERR_CHARS)}`)
  return text
}

export const parseCliOutput = (stdout: string): string => {
  let json: unknown
  try {
    json = JSON.parse(stdout)
  } catch {
    throw new Error(`claude -p did not return JSON: ${stdout.slice(0, MAX_STDERR_CHARS)}`)
  }
  const parsed = CliResultSchema.safeParse(json)
  if (!parsed.success) throw new Error('claude -p returned JSON without a text result')
  return resultText(parsed.data.is_error, parsed.data.result)
}

/** How the CLI process ended. */
export interface CliExit {
  readonly code: number | null
  readonly signal: NodeJS.Signals | null
  readonly stderr: string
  readonly timeoutMs: number
}

const stoppedError = (exit: CliExit): Error =>
  new Error(`claude -p stopped (${exit.signal}) after at most ${exit.timeoutMs / MS_PER_SECOND} s`)

const exitError = (exit: CliExit): Error =>
  new Error(`claude -p exited with code ${exit.code}: ${exit.stderr.trim().slice(0, MAX_STDERR_CHARS)}`)

/**
 * The answer of a streamed call: the result line when it arrived (even if the process was then
 * stopped). A call stopped before it (e.g. by `timeoutMs`) answers with the text streamed so far;
 * a CLI that exits with an error fails as in the json mode, whatever it streamed.
 */
export const streamAnswer = (read: StreamRead, exit: CliExit): string => {
  if (read.result) return resultText(read.result.isError, read.result.text)
  if (exit.signal) {
    if (read.streamed !== '') return read.streamed
    throw stoppedError(exit)
  }
  if (exit.code !== 0) throw exitError(exit)
  if (read.streamed !== '') return read.streamed
  throw new Error('claude -p ended without a result')
}

/** What a call does with stdout while the CLI runs, and how it turns it into the answer at the end. */
interface CliOutput {
  readonly onData: (chunk: Buffer) => void
  /** The answer, or throws why there is none. */
  readonly settle: (exit: CliExit) => string
}

/** `--output-format json`: one JSON object once the CLI ends. */
const jsonOutput = (): CliOutput => {
  const stdout: Buffer[] = []
  return {
    onData: (chunk) => stdout.push(chunk),
    settle: (exit) => {
      if (exit.signal) throw stoppedError(exit)
      const out = Buffer.concat(stdout).toString('utf8')
      if (exit.code !== 0 && out.trim() === '') throw exitError(exit)
      return parseCliOutput(out)
    },
  }
}

/** `stream-json`: text handed to `onText` as it arrives. A failing `onText` stops the CLI and fails the call. */
const streamOutput = (onText: (text: string) => void, stop: () => void): CliOutput => {
  const decoder = new StringDecoder('utf8')
  const reader = createStreamReader(onText)
  let failure: unknown
  return {
    onData: (chunk) => {
      if (failure !== undefined) return
      try {
        reader.push(decoder.write(chunk))
      } catch (error) {
        failure = error
        stop()
      }
    },
    settle: (exit) => {
      if (failure !== undefined) throw failure
      reader.push(decoder.end())
      return streamAnswer(reader.end(), exit)
    },
  }
}

export const runClaudeCli: RunClaude = (prompt, systemPrompt, options = {}) =>
  new Promise((resolve, reject) => {
    const timeoutMs = options.timeoutMs ?? CLAUDE_TIMEOUT_MS
    const child = spawn(CLAUDE_BIN, cliArgs(systemPrompt, options), {
      cwd: options.cwd ?? tmpdir(),
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    /** SIGKILL, not SIGTERM: a stuck CLI must never hold the job at its step. */
    const stop = (): void => {
      child.kill('SIGKILL')
    }
    const timer = setTimeout(stop, timeoutMs)
    const output = options.onText ? streamOutput(options.onText, stop) : jsonOutput()
    const stderr: Buffer[] = []
    child.stdout.on('data', output.onData)
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk))
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(new Error(`Could not start "${CLAUDE_BIN}" (is Claude Code installed and on PATH?): ${error.message}`))
    })
    // If the CLI dies before reading the prompt, the write fails with EPIPE: the exit is reported by 'close'.
    child.stdin.on('error', () => undefined)
    child.on('close', (code, signal) => {
      clearTimeout(timer)
      try {
        resolve(output.settle({ code, signal, stderr: Buffer.concat(stderr).toString('utf8'), timeoutMs }))
      } catch (error) {
        reject(error)
      }
    })
    child.stdin.end(prompt)
  })
