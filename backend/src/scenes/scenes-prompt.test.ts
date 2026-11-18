import { videoPropsFixture } from '@sherpas/shared'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PROMPTS_DIR } from '../paths'
import { promptVersion } from '../script/prompt-template'
import { fillScenesPrompt, scenesRetryPrompt } from './scenes-prompt'

const template = readFileSync(join(PROMPTS_DIR, 'scenes.md'), 'utf8')

describe('fillScenesPrompt', () => {
  const prompt = fillScenesPrompt(template, videoPropsFixture, ['what_matters', 'what_changes'])

  it('fills every placeholder of prompts/scenes.md', () => {
    expect(promptVersion(template)).toBe('1')
    expect(prompt).not.toMatch(/\{\{[A-Z_]+\}\}/)
  })

  it('names only the target files and describes only their scenes', () => {
    expect(prompt).toContain('`src/scenes/WhatMattersScene.tsx`, `src/scenes/WhatChangesScene.tsx`')
    expect(prompt).toContain('### Part 3, `what_matters`')
    expect(prompt).toContain('### Part 5, `what_changes`')
    expect(prompt).not.toContain('### Part 1')
    expect(prompt).toContain(videoPropsFixture.script.scenes[2].narration)
  })

  it('lists each fact the target scenes declare once, with its exact value', () => {
    const declared = new Set([...videoPropsFixture.script.scenes[2].factsUsed, ...videoPropsFixture.script.scenes[4].factsUsed])
    declared.forEach((name) => {
      const rows = prompt.split('\n').filter((line) => line.startsWith(`| ${name} |`))
      expect(rows).toEqual([expect.stringContaining(`| ${videoPropsFixture.facts[name].value} |`)])
    })
  })

  it('throws on an unknown placeholder', () => {
    expect(() => fillScenesPrompt('{{NOPE}}', videoPropsFixture, ['hook'])).toThrow('prompts/scenes.md has an unknown placeholder {{NOPE}}')
  })
})

describe('scenesRetryPrompt', () => {
  it('appends the problems to fix', () => {
    const retry = scenesRetryPrompt('base', ['Problem one.', 'Problem two.'])
    expect(retry.startsWith('base')).toBe(true)
    expect(retry).toContain('- Problem one.')
    expect(retry).toContain('- Problem two.')
  })
})
