/// <reference types="node" />
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { videoPropsFixture, type Part } from '@sherpas/shared'
import { afterEach, describe, expect, it } from 'vitest'
import { VIDEO_TEMPLATE_DIR } from '../paths'
import type { ClaudeCallOptions, RunClaude } from '../script/claude-cli'
import { describeTry, LIVE_SCENE_USAGE, parseLiveSceneArgs, tryLiveScenes } from './live-scene-try'
import { sceneFileOf } from './scene-module-contract'

const dirs: string[] = []
afterEach(() => dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })))

const runDirWithProps = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'sherpas-live-scene-try-'))
  dirs.push(dir)
  writeFileSync(join(dir, 'video-props.json'), JSON.stringify(videoPropsFixture))
  return dir
}

const standardSource = (part: Part): string => readFileSync(join(VIDEO_TEMPLATE_DIR, 'src', sceneFileOf(part)), 'utf8')

describe('parseLiveSceneArgs', () => {
  it('reads a relative run folder from where npm started, the parts and the call overrides', () => {
    // Act
    const options = parseLiveSceneArgs(['runs/a/b/c', '--parts', 'what_matters,what_changes', '--effort', 'medium', '--model', 'opus', '--limit', '30'], '/repo')

    // Assert
    expect(options).toEqual({
      runDir: '/repo/runs/a/b/c',
      parts: ['what_matters', 'what_changes'],
      call: { model: 'opus', effort: 'medium', timeoutMs: 30_000 },
    })
  })

  it('designs the three parts with the run defaults when no flags are given', () => {
    // Act
    const options = parseLiveSceneArgs(['/abs/run'], '/repo')

    // Assert
    expect(options).toEqual({ runDir: '/abs/run', parts: ['what_matters', 'first_step', 'what_changes'], call: {} })
  })

  it('refuses a missing run folder, a part Claude never designs in a Live run, and a bad limit', () => {
    // Act
    const missing = () => parseLiveSceneArgs(['--parts', 'hook'], '/repo')
    const hook = () => parseLiveSceneArgs(['run', '--parts', 'hook'], '/repo')
    const limit = () => parseLiveSceneArgs(['run', '--limit', 'soon'], '/repo')

    // Assert
    expect(missing).toThrow(LIVE_SCENE_USAGE)
    expect(hook).toThrow('Unknown parts: hook')
    expect(limit).toThrow('--limit must be a number of seconds, got "soon"')
  })
})

describe('tryLiveScenes', () => {
  it("runs the chosen parts in parallel with the call overrides and writes them under the run's tries", async () => {
    // Arrange
    const runDir = runDirWithProps()
    const calls: ClaudeCallOptions[] = []
    const runClaude: RunClaude = async (prompt, _system, options) => {
      calls.push(options ?? {})
      return prompt.includes('`what_matters`') ? standardSource('what_matters') : 'Sorry, no scene.'
    }
    const options = { runDir, parts: ['what_matters', 'first_step'] as Part[], call: { effort: 'medium' } }

    // Act
    const { folder, results } = await tryLiveScenes(options, { runClaude, typecheck: async () => [] }, () => new Date('2026-11-19T12:00:00.000Z'))

    // Assert
    expect(folder.dir).toBe(join(runDir, 'live-scene-tries', 'effort-medium', 'sonnet', '2026-11-19T12-00-00-000Z'))
    expect(calls.map((call) => call.effort)).toEqual(['medium', 'medium'])
    expect(results.map((result) => [result.part, result.status])).toEqual([
      ['what_matters', 'ready'],
      ['first_step', 'standard'],
    ])
    expect(readFileSync(folder.path('scene-what_matters.tsx'), 'utf8')).toBe(standardSource('what_matters'))
  })
})

describe('describeTry', () => {
  it('prints the answer time and size, each check and the module size of a ready scene', () => {
    // Act
    const lines = describeTry({
      part: 'what_matters',
      status: 'ready',
      answerSec: 18.46,
      chars: 4312,
      bytes: 7981,
      checks: [
        { name: 'locked files', problems: [], sec: 0.001 },
        { name: 'tsc', problems: [], sec: 0.214 },
      ],
    })

    // Assert
    expect(lines).toEqual(['what_matters: READY · answer in 18.5 s, 4,312 characters', '  locked files ok 0.00 s · tsc ok 0.21 s', '  module 7,981 B'])
  })

  it('prints the failed check, the reason and every other problem of a Standard scene', () => {
    // Act
    const lines = describeTry({
      part: 'first_step',
      status: 'standard',
      reason: 'tsc failed: a (and 1 more)',
      problems: ['TypeScript: a', 'TypeScript: b'],
      checks: [{ name: 'tsc', problems: ['TypeScript: a', 'TypeScript: b'], sec: 0.2 }],
    })

    // Assert
    expect(lines).toEqual(['first_step: STANDARD · no answer', '  tsc FAILED 0.20 s', '  reason: tsc failed: a (and 1 more)', '    TypeScript: b'])
  })
})
