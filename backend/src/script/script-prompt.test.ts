/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PROMPTS_DIR } from '../paths'
import { danielCase } from './script-fixtures.test-helper'
import { factsTable, fillScriptPrompt, promptVersion, retryPrompt, sayItAs } from './script-prompt'

const template = readFileSync(join(PROMPTS_DIR, 'script.md'), 'utf8')
const { brief, facts } = danielCase('nerd')

describe('script prompt', () => {
  it('fills every placeholder of prompts/script.md', () => {
    const prompt = fillScriptPrompt(template, brief, facts)
    expect(prompt).not.toMatch(/\{\{[A-Z_]+\}\}/)
    expect(prompt).toContain('"nickname": "Dan"')
    expect(prompt).toContain('Partner (the other adult in the household, or null): Emily')
    expect(prompt).toContain('`factsUsed` must start with `SCORE_NOW` then `SCORE_AFTER_')
    expect(prompt).toContain('"cta": { "type": "research_first"')
  })

  it('throws on a placeholder it does not know', () => {
    expect(() => fillScriptPrompt('{{NOPE}}', brief, facts)).toThrow('unknown placeholder {{NOPE}}')
  })

  it('lists each fact with the spellings the number guard accepts', () => {
    expect(sayItAs({ value: 1427455.89, unit: 'usd', label: 'Gap' })).toEqual(['$1.4M', '$1,427,456'])
    expect(sayItAs({ value: 52, unit: 'points', label: 'Score' })).toEqual(['52'])
    expect(factsTable(facts)).toContain('| SCORE_NOW | "52" | points |')
  })

  it('reads the version from the first line of the template', () => {
    expect(promptVersion(template)).toBe('1')
  })

  it('adds the rejected answer and its problems to a retry', () => {
    const retry = retryPrompt('PROMPT', '{"bad": true}', ['Problem one.', 'Problem two.'])
    expect(retry.startsWith('PROMPT')).toBe(true)
    expect(retry).toContain('{"bad": true}')
    expect(retry).toContain('- Problem one.\n\n- Problem two.')
  })
})
