/// <reference types="node" />
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { videoPropsFixture } from '@sherpas/shared'
import { afterEach, describe, expect, it } from 'vitest'
import type { CheckFrames } from '../pipeline/render-video'
import { createRunFolder, type RunFolder } from '../pipeline/run-folder'
import type { ClaudeCallOptions, RunClaude } from '../script/claude-cli'
import { reviewFrames } from './review-frames'
import { REVIEW_TIMEOUT_MS } from './visual-review'
import { createScenesWriter, MAX_ATTEMPTS, type ScenesWriterDeps } from './write-scenes'

const TARGET = 'src/scenes/WhatMattersScene.tsx'
const TEMPLATE = '<!-- prompt: scenes · version: 7 -->\nRedesign {{TARGET_FILES}} for {{SURVEY}}.\n{{SCENES}}\n{{FACTS}}'
const REVIEW_TEMPLATE = '<!-- prompt: visual-review · version: 3 -->\nLook at these frames of {{TARGET_FILES}}:\n{{FRAMES}}\n{{SCENES}}'
const dirs: string[] = []

afterEach(() => dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })))

const newFolder = (): RunFolder => {
  const runsDir = mkdtempSync(join(tmpdir(), 'sherpas-scenes-'))
  dirs.push(runsDir)
  return createRunFolder(runsDir, 'daniel-emily-johnson', 'daniel', new Date('2026-11-18T16:05:03.123Z'))
}

const passingFrames: CheckFrames = async () => ({ serveUrl: 'file:///bundle', durationSec: 72, problems: [], stills: [] })

/** A fake Claude that runs one edit per call in the sandbox, and records every prompt and option it got. */
const scriptedClaude = (edits: ReadonlyArray<(cwd: string) => void>) => {
  const calls: Array<{ prompt: string } & ClaudeCallOptions> = []
  const runClaude: RunClaude = async (prompt, _system, options) => {
    calls.push({ prompt, ...options })
    const edit = edits[calls.length - 1]
    if (options?.cwd && edit) edit(options.cwd)
    return 'Changed the scene.'
  }
  return { runClaude, calls }
}

const goodEdit = (cwd: string): void =>
  writeFileSync(join(cwd, TARGET), "export const WhatMattersScene = () => null // redesigned\n")

const writer = (overrides: Partial<ScenesWriterDeps> & Pick<ScenesWriterDeps, 'runClaude'>) =>
  createScenesWriter({
    checkFrames: passingFrames,
    typecheck: async () => [],
    template: TEMPLATE,
    reviewTemplate: REVIEW_TEMPLATE,
    parts: ['what_matters'],
    ...overrides,
  })

describe('writeScenes', () => {
  it("keeps Claude's scenes when the first attempt passes every check", async () => {
    const folder = newFolder()
    const { runClaude, calls } = scriptedClaude([goodEdit])
    const outcome = await writer({ runClaude })(videoPropsFixture, folder, () => undefined)

    expect(outcome).toEqual({
      source: 'claude',
      attempts: 1,
      sandboxDir: folder.path('video-template'),
      serveUrl: 'file:///bundle',
      review: 'unchanged',
    })
    expect(calls[0].cwd).toBe(folder.path('video-template'))
    expect(calls[0].tools).toEqual(['Read', 'Write', 'Edit', 'Bash'])
    expect(calls[0].prompt).toContain('`src/scenes/WhatMattersScene.tsx`')
    expect(readFileSync(folder.path('scenes-prompt.md'), 'utf8')).toBe(calls[0].prompt)
    expect(readFileSync(folder.path('scenes-attempt-1.txt'), 'utf8')).toContain('// redesigned')
    expect(readFileSync(folder.path('log.txt'), 'utf8')).toContain('written by Claude (prompt v7, attempt 1/3)')
  })

  it('restores a locked file Claude touched and retries with the problem', async () => {
    const folder = newFolder()
    const tokens = (cwd: string) => join(cwd, 'src/locked/tokens.ts')
    const original = () => readFileSync(tokens(folder.path('video-template')), 'utf8')
    const { runClaude, calls } = scriptedClaude([
      (cwd) => {
        goodEdit(cwd)
        writeFileSync(tokens(cwd), 'export const COLORS = {}\n')
      },
      () => undefined,
    ])
    const outcome = await writer({ runClaude })(videoPropsFixture, folder, () => undefined)

    expect(outcome.source).toBe('claude')
    expect(outcome.attempts).toBe(2)
    expect(calls[1].prompt).toContain('Locked file src/locked/tokens.ts was changed')
    expect(original()).not.toBe('export const COLORS = {}\n')
  })

  it('sends number guard, tsc and frame problems back to Claude', async () => {
    const folder = newFolder()
    const inventedFigure = (cwd: string) =>
      writeFileSync(join(cwd, TARGET), 'export const WhatMattersScene = () => <div>$1.5M</div>\n')
    let typechecks = 0
    let frameChecks = 0
    const { runClaude, calls } = scriptedClaude([inventedFigure, goodEdit, () => undefined])
    const outcome = await writer({
      runClaude,
      typecheck: async () => (++typechecks === 2 ? ["TypeScript: src/scenes/WhatMattersScene.tsx(1,1): error TS2304"] : []),
      checkFrames: async (...args) => (++frameChecks === 1 ? { ...(await passingFrames(...args)), durationSec: 130 } : passingFrames(...args)),
    })(videoPropsFixture, folder, () => undefined)

    expect(calls[1].prompt).toMatch(/src\/scenes\/WhatMattersScene\.tsx: Number "\$1\.5M"/)
    expect(calls[2].prompt).toContain('error TS2304')
    expect(outcome).toMatchObject({ source: 'fallback', attempts: MAX_ATTEMPTS })
    expect(readFileSync(folder.path('scenes-attempt-3.txt'), 'utf8')).toContain('The video lasts 130.0 s')
    expect(readFileSync(folder.path('log.txt'), 'utf8')).toContain("Claude failed 3 times; rendering the template's own scenes")
  })

  it('falls back after three attempts that change nothing, reporting each try', async () => {
    const folder = newFolder()
    const tries: number[] = []
    const { runClaude } = scriptedClaude([])
    const outcome = await writer({ runClaude })(videoPropsFixture, folder, (attempt) => tries.push(attempt))

    expect(outcome.source).toBe('fallback')
    expect(tries).toEqual([1, 2, 3])
    expect(readFileSync(folder.path('scenes-attempt-1.txt'), 'utf8')).toContain('None of the scene files you were asked to redesign changed.')
  })

  it('accepts finished files from a call cut by the time limit', async () => {
    const folder = newFolder()
    const runClaude: RunClaude = async (_prompt, _system, options) => {
      if (options?.cwd) goodEdit(options.cwd)
      throw new Error('claude -p stopped (SIGKILL) after at most 120 s')
    }
    const outcome = await writer({ runClaude })(videoPropsFixture, folder, () => undefined)

    expect(outcome.source).toBe('claude')
    expect(readFileSync(folder.path('log.txt'), 'utf8')).toContain('Claude call failed: claude -p stopped (SIGKILL)')
  })
})

describe('writeScenes: the visual review (#10)', () => {
  const inventedFigure = (cwd: string): void =>
    writeFileSync(join(cwd, TARGET), 'export const WhatMattersScene = () => <div>$1.5M</div>\n')

  /** Check frames that hand out a new bundle on every call, and remember where each call wrote. */
  const countingFrames = () => {
    const calls: Array<{ frames: readonly number[]; outDir: string }> = []
    const checkFrames: CheckFrames = async (_dir, _props, frames, outDir) => {
      calls.push({ frames, outDir })
      return { serveUrl: `file:///bundle-${calls.length}`, durationSec: 72, problems: [], stills: [] }
    }
    return { checkFrames, calls }
  }

  it('shows Claude the review frames of the passing attempt and keeps it when nothing changes', async () => {
    const folder = newFolder()
    const reviews: number[] = []
    const { runClaude, calls } = scriptedClaude([goodEdit])
    const { checkFrames, calls: renders } = countingFrames()
    const outcome = await writer({ runClaude, checkFrames })(videoPropsFixture, folder, () => undefined, () => reviews.push(1))

    const stillsDir = folder.path('scenes-check/attempt-1')
    const expected = reviewFrames(videoPropsFixture, ['what_matters'])
    expect(outcome).toMatchObject({ source: 'claude', serveUrl: 'file:///bundle-1', review: 'unchanged' })
    expect(reviews).toEqual([1])
    expect(renders).toHaveLength(1)
    expect(renders[0].frames).toEqual(expect.arrayContaining(expected.map((frame) => frame.frame)))
    expect(calls[1]).toMatchObject({ cwd: folder.path('video-template'), addDirs: [stillsDir], timeoutMs: REVIEW_TIMEOUT_MS })
    expect(calls[1].tools).toEqual(['Read', 'Write', 'Edit', 'Bash'])
    expect(calls[1].prompt).toContain(join(stillsDir, `frame-${expected[0].frame}.png`))
    expect(readFileSync(folder.path('visual-review.txt'), 'utf8')).toContain('result: unchanged')
    expect(readFileSync(folder.path('log.txt'), 'utf8')).toContain('[review] no changes (prompt v3)')
  })

  it('keeps a fix that passes every validator again and renders its bundle', async () => {
    const folder = newFolder()
    const fix = (cwd: string) => writeFileSync(join(cwd, TARGET), 'export const WhatMattersScene = () => null // fixed\n')
    const { runClaude } = scriptedClaude([goodEdit, fix])
    const { checkFrames, calls: renders } = countingFrames()
    const outcome = await writer({ runClaude, checkFrames })(videoPropsFixture, folder, () => undefined)

    expect(outcome).toMatchObject({ source: 'claude', serveUrl: 'file:///bundle-2', review: 'kept' })
    expect(renders[1].outDir).toBe(folder.path('scenes-check/review'))
    expect(readFileSync(join(folder.path('video-template'), TARGET), 'utf8')).toContain('// fixed')
    expect(readFileSync(folder.path('log.txt'), 'utf8')).toContain(`[review] kept Claude's visual fixes to ${TARGET}`)
  })

  it('puts the passing files back and renders their bundle when the fix breaks a validator', async () => {
    const folder = newFolder()
    const sandbox = () => folder.path('video-template')
    const passing = () => readFileSync(join(sandbox(), TARGET), 'utf8')
    const badFix = (cwd: string) => {
      inventedFigure(cwd)
      writeFileSync(join(cwd, 'src/components/Extra.tsx'), 'export const Extra = () => null\n')
    }
    const { runClaude } = scriptedClaude([goodEdit, badFix])
    const { checkFrames, calls: renders } = countingFrames()
    const outcome = await writer({ runClaude, checkFrames })(videoPropsFixture, folder, () => undefined)

    expect(outcome).toMatchObject({ source: 'claude', serveUrl: 'file:///bundle-1', review: 'reverted' })
    expect(renders).toHaveLength(1)
    expect(passing()).toContain('// redesigned')
    expect(existsSync(join(sandbox(), 'src/components/Extra.tsx'))).toBe(false)
    expect(readFileSync(folder.path('visual-review.txt'), 'utf8')).toMatch(/Number "\$1\.5M"/)
    expect(readFileSync(folder.path('log.txt'), 'utf8')).toContain('[review] reverted the visual fixes')
  })

  it('validates a fix left by a review call cut by the time limit', async () => {
    const folder = newFolder()
    let call = 0
    const runClaude: RunClaude = async (_prompt, _system, options) => {
      call += 1
      if (call === 1 && options?.cwd) goodEdit(options.cwd)
      if (call === 2 && options?.cwd) writeFileSync(join(options.cwd, TARGET), 'export const WhatMattersScene = () => null // late\n')
      if (call === 2) throw new Error('claude -p stopped (SIGKILL) after at most 75 s')
      return 'Changed the scene.'
    }
    const outcome = await writer({ runClaude })(videoPropsFixture, folder, () => undefined)

    expect(outcome).toMatchObject({ source: 'claude', review: 'kept' })
    expect(readFileSync(folder.path('log.txt'), 'utf8')).toContain('[review] Claude call failed: claude -p stopped (SIGKILL)')
  })

  it('skips the review when it is turned off', async () => {
    const folder = newFolder()
    const { runClaude, calls } = scriptedClaude([goodEdit])
    const outcome = await writer({ runClaude, review: false })(videoPropsFixture, folder, () => undefined)

    expect(calls).toHaveLength(1)
    expect(outcome).not.toHaveProperty('review')
    expect(existsSync(folder.path('visual-review.txt'))).toBe(false)
  })

  it('does not review the fallback scenes', async () => {
    const folder = newFolder()
    const { runClaude, calls } = scriptedClaude([])
    const outcome = await writer({ runClaude })(videoPropsFixture, folder, () => undefined)

    expect(outcome.source).toBe('fallback')
    expect(calls).toHaveLength(MAX_ATTEMPTS)
  })
})
