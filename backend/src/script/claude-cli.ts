/// <reference types="node" />
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { z } from 'zod'

/** Sends one prompt to Claude and resolves with its text answer. Injected so tests never call Claude. */
export type RunClaude = (prompt: string, systemPrompt: string) => Promise<string>

/** Claude Code CLI, headless (SPEC §5): `claude -p` with the prompt on stdin. */
const CLAUDE_BIN = 'claude'
/** One attempt of the script; Claude usually answers in well under a minute. */
export const CLAUDE_TIMEOUT_MS = 180_000
const MAX_STDERR_CHARS = 500

/**
 * Text only: no tools, no MCP servers, no project or user settings (and so no CLAUDE.md or hooks),
 * no saved session. The working directory is outside the repo for the same reason.
 */
const ARGS = [
  '-p',
  '--output-format',
  'json',
  '--tools',
  '',
  '--setting-sources',
  '',
  '--strict-mcp-config',
  '--no-session-persistence',
] as const

/** The part of `--output-format json` we read. */
const CliResultSchema = z.object({ is_error: z.boolean(), result: z.string() })

export const parseCliOutput = (stdout: string): string => {
  let json: unknown
  try {
    json = JSON.parse(stdout)
  } catch {
    throw new Error(`claude -p did not return JSON: ${stdout.slice(0, MAX_STDERR_CHARS)}`)
  }
  const parsed = CliResultSchema.safeParse(json)
  if (!parsed.success) throw new Error('claude -p returned JSON without a text result')
  if (parsed.data.is_error) throw new Error(`claude -p failed: ${parsed.data.result.slice(0, MAX_STDERR_CHARS)}`)
  return parsed.data.result
}

export const runClaudeCli: RunClaude = (prompt, systemPrompt) =>
  new Promise((resolve, reject) => {
    const child = spawn(CLAUDE_BIN, [...ARGS, '--system-prompt', systemPrompt], {
      cwd: tmpdir(),
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    /** SIGKILL, not SIGTERM: a stuck CLI must never hold the job at the script step. */
    const timer = setTimeout(() => child.kill('SIGKILL'), CLAUDE_TIMEOUT_MS)
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk))
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk))
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(new Error(`Could not start "${CLAUDE_BIN}" (is Claude Code installed and on PATH?): ${error.message}`))
    })
    // If the CLI dies before reading the prompt, the write fails with EPIPE: the exit is reported by 'close'.
    child.stdin.on('error', () => undefined)
    child.on('close', (code, signal) => {
      clearTimeout(timer)
      if (signal) return reject(new Error(`claude -p stopped (${signal}) after at most ${CLAUDE_TIMEOUT_MS / 1000} s`))
      const out = Buffer.concat(stdout).toString('utf8')
      if (code !== 0 && out.trim() === '') {
        const err = Buffer.concat(stderr).toString('utf8').trim().slice(0, MAX_STDERR_CHARS)
        return reject(new Error(`claude -p exited with code ${code}: ${err}`))
      }
      try {
        resolve(parseCliOutput(out))
      } catch (error) {
        reject(error)
      }
    })
    child.stdin.end(prompt)
  })
