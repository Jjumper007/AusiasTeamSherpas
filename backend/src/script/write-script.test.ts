import { describe, expect, it } from 'vitest'
import type { RunClaude } from './claude-cli'
import { danielCase } from './script-fixtures.test-helper'
import { MAX_ATTEMPTS, writeScript } from './write-script'

const { brief, facts, script } = danielCase()
const valid = JSON.stringify(script)
const invalid = JSON.stringify({ ...script, scenes: script.scenes.map((scene) => ({ ...scene, narration: 'About $24,500.' })) })

/** A run folder in memory. */
const memoryFolder = () => {
  const files = new Map<string, string>()
  const lines: string[] = []
  return {
    files,
    lines,
    folder: {
      writeText: (name: string, text: string) => void files.set(name, text),
      writeJson: (name: string, value: unknown) => void files.set(name, JSON.stringify(value)),
      log: (line: string) => void lines.push(line),
    },
  }
}

/** A fake Claude that gives the answers in order and records every prompt. */
const scriptedClaude = (answers: ReadonlyArray<string | Error>) => {
  const prompts: string[] = []
  const runClaude: RunClaude = async (prompt) => {
    const answer = answers[prompts.length]
    prompts.push(prompt)
    if (answer instanceof Error) throw answer
    return answer
  }
  return { prompts, runClaude }
}

const write = (answers: ReadonlyArray<string | Error>) => {
  const claude = scriptedClaude(answers)
  const memory = memoryFolder()
  const attempts: number[] = []
  const result = writeScript({
    brief,
    facts,
    folder: memory.folder,
    runClaude: claude.runClaude,
    template: '<!-- prompt: script · version: 7 -->\nWrite for {{SURVEY}}',
    onAttempt: (attempt) => attempts.push(attempt),
  })
  return { result, prompts: claude.prompts, attempts, ...memory }
}

describe('writeScript', () => {
  it("uses Claude's script when the first answer passes, and saves prompt, attempt and script", async () => {
    const { result, files, lines, attempts } = write([valid])
    expect(await result).toEqual({ script, source: 'claude', attempts: 1 })
    expect(attempts).toEqual([1])
    expect([...files.keys()]).toEqual(['script-prompt.md', 'script-attempt-1.txt', 'script.json'])
    expect(lines.at(-1)).toBe('[script] written by Claude (prompt v7, attempt 1/3)')
  })

  it('retries with the rejected answer and its problems', async () => {
    const { result, prompts } = write([invalid, valid])
    expect((await result).attempts).toBe(2)
    expect(prompts[1]).toContain('## Your previous answer was rejected')
    expect(prompts[1]).toContain('"$24,500"')
  })

  it('counts a failed call as an attempt and retries with the original prompt', async () => {
    const { result, prompts, files } = write([new Error('timeout'), valid])
    expect((await result).source).toBe('claude')
    expect(prompts[1]).toBe(prompts[0])
    expect(files.get('script-attempt-1.txt')).toContain('Claude call failed: timeout')
  })

  it(`falls back to the script without Claude after ${MAX_ATTEMPTS} rejected answers`, async () => {
    const { result, prompts, lines, files } = write([invalid, invalid, invalid, valid])
    expect(await result).toEqual({ script, source: 'fallback', attempts: MAX_ATTEMPTS })
    expect(prompts).toHaveLength(MAX_ATTEMPTS)
    expect(JSON.parse(files.get('script.json') ?? '')).toEqual(script)
    expect(lines.at(-1)).toMatch(/Claude failed 3 times/)
  })
})
