/// <reference types="node" />
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Part } from '@sherpas/shared'
import { afterEach, describe, expect, it } from 'vitest'
import type { LiveJobEvent, LiveSceneEvent } from '../api/live-types'
import { createJobStore } from '../jobs/job-store'
import { RUNS_DIR, VIDEO_TEMPLATE_DIR } from '../paths'
import type { RunClaude } from '../script/claude-cli'
import {
  claudeScriptFor,
  createFakeClock,
  emily,
  fakeRecorder,
  fallbackFor,
  logLines,
  removeTempDirs,
  RUN_STAMP,
  runLive,
  streamingClaude,
  tempRunsDir,
  type ClaudeCall,
} from './live-fakes.test-helper'
import { acceptedLiveScenes, LIVE_SCENE_PARTS } from './live-scene-files'
import { LIVE_SCENE_EFFORT, LIVE_SCENE_SYSTEM_PROMPT, LIVE_SCENE_TIMEOUT_MS, type SceneStepDeps } from './live-scene-step'
import { savedSceneModulePath, sceneFileOf } from './scene-module-contract'

const repoDirs: string[] = []
afterEach(() => {
  removeTempDirs()
  repoDirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }))
})

const scriptAnswer = JSON.stringify(claudeScriptFor(fallbackFor(emily)), null, 2)
const PART_IN_PROMPT = /part \d of 5, `(\w+)`/

/** The Standard scene of a part, marked as Claude's: it passes every check. */
const claudeSource = (part: Part): string =>
  `${readFileSync(join(VIDEO_TEMPLATE_DIR, 'src', sceneFileOf(part)), 'utf8')}\n// Designed by Claude for ${part}\n`

type Answer = string | Error | (() => Promise<string>)

/** `claude -p` for the scenes: answers each part from `answers` (by default a scene that passes). */
const sceneClaude = (answers: Partial<Record<Part, Answer>> = {}) => {
  const calls: ClaudeCall[] = []
  const runClaude: RunClaude = async (prompt, systemPrompt, options) => {
    calls.push({ prompt, systemPrompt, options })
    const part = PART_IN_PROMPT.exec(prompt)?.[1] as Part
    const answer = answers[part] ?? claudeSource(part)
    if (answer instanceof Error) throw answer
    return typeof answer === 'function' ? answer() : answer
  }
  return { runClaude, calls }
}

interface ScenesRun {
  readonly answers?: Partial<Record<Part, Answer>>
  readonly step?: Partial<SceneStepDeps>
  readonly runsDir?: string
  readonly store?: ReturnType<typeof createJobStore<LiveJobEvent>>
}

/** A Live run whose script is Claude's and whose scenes come from `answers`; `tsc` passes unless `step` says otherwise. */
const runWithScenes = async ({ answers, step, runsDir, store }: ScenesRun = {}) => {
  const clock = createFakeClock()
  const claude = sceneClaude(answers)
  const scenes: SceneStepDeps = { runClaude: claude.runClaude, typecheck: async () => [], ...step }
  const run = await runLive(emily, { runClaude: streamingClaude(scriptAnswer, clock).runClaude, recordScene: fakeRecorder().recordScene, clock, scenes, runsDir, store })
  return { ...run, claude }
}

const typesOf = (events: readonly LiveJobEvent[]): string[] =>
  events.filter((event) => event.type !== 'progress' && event.type !== 'step').map((event) => event.type)
const sceneOf = (events: readonly LiveJobEvent[], part: Part): LiveSceneEvent | undefined =>
  events.find((event): event is LiveSceneEvent => event.type === 'scene' && event.part === part)
const reasonOf = (events: readonly LiveJobEvent[], part: Part): string => {
  const event = sceneOf(events, part)
  return event?.status === 'standard' ? event.reason : `not standard: ${JSON.stringify(event)}`
}
const runIdOf = `${emily.caseId}/${emily.member}/${RUN_STAMP}`

describe("runLiveJob with Claude's scenes, all accepted", () => {
  it('sends one scene ready per part 3–5 with the URL of its saved module, then end', async () => {
    // Act
    const { events, job } = await runWithScenes()

    // Assert
    const types = typesOf(events)
    expect(types.filter((type) => type === 'scene')).toHaveLength(3)
    expect(types.slice(0, 2)).toEqual(['live-ready', 'page'])
    expect(types.at(-1)).toBe('end')
    LIVE_SCENE_PARTS.forEach((part) =>
      expect(sceneOf(events, part)).toEqual({ type: 'scene', part, status: 'ready', moduleUrl: savedSceneModulePath(runIdOf, part) }),
    )
    expect(job?.status).toBe('done')
  })

  it('keeps the prompt, the answer, the accepted source and the compiled module of each part', async () => {
    // Act
    const { folder, read, claude } = await runWithScenes()

    // Assert
    LIVE_SCENE_PARTS.forEach((part) => {
      const call = claude.calls.find((each) => each.prompt.includes(`\`${part}\``))
      expect(read(`scene-${part}-prompt.md`)).toBe(call?.prompt)
      expect(read(`scene-${part}-answer.txt`)).toBe(claudeSource(part))
      expect(read(`scene-${part}.tsx`)).toContain(`// Designed by Claude for ${part}`)
      expect(read(`scene-${part}.js`)).toMatch(/export\s*\{/)
    })
    expect(acceptedLiveScenes(folder).map((scene) => scene.part)).toEqual(LIVE_SCENE_PARTS)
  })

  it('asks Sonnet once per part, without tools, with the live scene prompt, the effort and the limit', async () => {
    // Act
    const { claude } = await runWithScenes()

    // Assert
    expect(claude.calls).toHaveLength(3)
    claude.calls.forEach((call) => {
      expect(call.systemPrompt).toBe(LIVE_SCENE_SYSTEM_PROMPT)
      expect(call.options).toEqual({ model: 'sonnet', effort: LIVE_SCENE_EFFORT, timeoutMs: LIVE_SCENE_TIMEOUT_MS })
    })
    const narration = claudeScriptFor(fallbackFor(emily)).scenes[2].narration
    expect(claude.calls.find((call) => call.prompt.includes('`what_matters`'))?.prompt).toContain(narration)
  })

  it("logs each scene's call, answer, checks and result with the seconds since the job started", async () => {
    // Act
    const { read } = await runWithScenes()

    // Assert
    const lines = logLines(read('log.txt'))
    const of = (part: Part) => lines.filter((line) => line.includes(`] scene ${part}: `))
    LIVE_SCENE_PARTS.forEach((part) => {
      const scene = of(part)
      expect(scene[0]).toMatch(/\[live \+\d+\.\ds\] scene \w+: asking Claude \(sonnet, effort low, prompt v2, limit 40 s; part about \d+\.\d s\)$/)
      expect(scene[1]).toMatch(/answer in \d+\.\d s \([\d,]+ characters\)$/)
      expect(scene[2]).toMatch(/checks passed in \d+\.\d s \(locked files, number guard, tsc, compile [\d,]+ B\)$/)
      expect(scene[3]).toMatch(/scene \w+: ready$/)
    })
    expect(lines.some((line) => line.includes('scenes: all 3 resolved: '))).toBe(true)
  })

  it('reads the scene file out of a Markdown fence with prose around it', async () => {
    // Act
    const { events } = await runWithScenes({
      answers: { what_matters: `Here is the scene:\n\`\`\`tsx\n${claudeSource('what_matters')}\`\`\`\nIt reveals the gap first.` },
    })

    // Assert
    expect(sceneOf(events, 'what_matters')?.status).toBe('ready')
  })
})

describe("runLiveJob with Claude's scenes, a scene that fails its checks", () => {
  it('ends on the Standard scene with the reason: number guard, tsc or compilation', async () => {
    // Arrange
    const answers = {
      what_matters: `${claudeSource('what_matters')}export const Extra = () => <div>$1.5M</div>\n`,
      what_changes: `import { readFileSync } from 'node:fs'\n${claudeSource('what_changes')}export const unused = readFileSync\n`,
    }
    const tscError = 'TypeScript: src/scenes/FirstStepScene.tsx(3,5): error TS2322: Type string is not assignable to type number.'
    const typecheck = async (sandboxDir: string) => (sandboxDir.endsWith('first_step') ? [tscError] : [])

    // Act
    const { events, folder } = await runWithScenes({ answers, step: { typecheck } })

    // Assert
    expect(reasonOf(events, 'what_matters')).toMatch(/^number guard failed: src\/scenes\/WhatMattersScene\.tsx: Number "\$1\.5M"/)
    expect(reasonOf(events, 'first_step')).toBe('tsc failed: src/scenes/FirstStepScene.tsx(3,5): error TS2322: Type string is not assignable to type number.')
    expect(reasonOf(events, 'what_changes')).toMatch(/^compile failed: .*Import "node:fs" is not available to a live scene/)
    expect(acceptedLiveScenes(folder)).toEqual([])
    expect(existsSync(join(folder, 'scene-what_matters.js'))).toBe(false)
    expect(typesOf(events).at(-1)).toBe('end')
  })

  it('ends on the Standard scene when a locked file of its copy changed while Claude answered', async () => {
    // Arrange
    const runsDir = tempRunsDir()
    const tokens = join(runsDir, emily.caseId, emily.member, RUN_STAMP, 'live-scenes', 'what_changes', 'src', 'locked', 'tokens.ts')
    const touchLocked = async (): Promise<string> => {
      writeFileSync(tokens, 'export const COLORS = {}\n')
      return claudeSource('what_changes')
    }

    // Act
    const { events } = await runWithScenes({ answers: { what_changes: touchLocked }, runsDir })

    // Assert
    expect(reasonOf(events, 'what_changes')).toMatch(/^locked files failed: Locked file src\/locked\/tokens\.ts was changed/)
    expect(readFileSync(tokens, 'utf8')).not.toBe('export const COLORS = {}\n')
  })

  it('keeps the other parts when one fails', async () => {
    // Act
    const { events, folder } = await runWithScenes({ answers: { first_step: 'export const Nothing = () => null\n' } })

    // Assert
    expect(reasonOf(events, 'first_step')).toBe("Claude's answer does not export FirstStepScene")
    expect(sceneOf(events, 'what_matters')?.status).toBe('ready')
    expect(sceneOf(events, 'what_changes')?.status).toBe('ready')
    expect(acceptedLiveScenes(folder).map((scene) => scene.part)).toEqual(['what_matters', 'what_changes'])
  })

  it('ends on the Standard scene when Claude fails, is stopped at the limit or answers nothing', async () => {
    // Arrange
    const answers = {
      what_matters: new Error('claude -p exited with code 1: overloaded'),
      first_step: new Error('claude -p stopped (SIGKILL) after at most 40 s'),
      what_changes: '',
    }

    // Act
    const { events, read } = await runWithScenes({ answers })

    // Assert
    expect(reasonOf(events, 'what_matters')).toBe('Claude call failed: claude -p exited with code 1: overloaded')
    expect(reasonOf(events, 'first_step')).toBe('Claude call failed: claude -p stopped (SIGKILL) after at most 40 s')
    expect(reasonOf(events, 'what_changes')).toBe("Claude's answer was empty")
    expect(logLines(read('log.txt'))).toContainEqual(expect.stringMatching(/scene what_changes: standard: Claude's answer was empty$/))
  })

  it('never turns a failure inside the scene work into the run error', async () => {
    // Act
    const { events, job } = await runWithScenes({ step: { templateDir: join(tempRunsDir(), 'no-template') } })

    // Assert
    LIVE_SCENE_PARTS.forEach((part) => expect(reasonOf(events, part)).toMatch(/^the scene could not be checked: /))
    expect(events.some((event) => event.type === 'error')).toBe(false)
    expect(typesOf(events).at(-1)).toBe('end')
    expect(job?.status).toBe('done')
  })
})

describe("runLiveJob with Claude's scenes, timing", () => {
  it('sends end only after the three parts are resolved, even when one resolves after page', async () => {
    // Arrange
    let release: () => void = () => undefined
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    const base = createJobStore<LiveJobEvent>()
    const store: typeof base = {
      ...base,
      emit: (id, event) => {
        base.emit(id, event)
        if (event.type === 'page') setTimeout(release, 0)
      },
    }
    const late = async (): Promise<string> => {
      await held
      return claudeSource('what_changes')
    }

    // Act
    const { events } = await runWithScenes({ answers: { what_changes: late }, store })

    // Assert
    const types = typesOf(events)
    const lastScene = events.findIndex((event) => event === sceneOf(events, 'what_changes'))
    expect(lastScene).toBeGreaterThan(events.findIndex((event) => event.type === 'page'))
    expect(events.findIndex((event) => event.type === 'end')).toBeGreaterThan(lastScene)
    expect(types.at(-1)).toBe('end')
  })
})

describe("runLiveJob with Claude's scenes, the real tsc", () => {
  it("rejects a part whose file does not type-check in its own copy and accepts the others", async () => {
    // Arrange: inside the repo, so tsc resolves the template's packages from node_modules.
    // runs/ is gitignored, so a fresh clone has none: create it (only the temp folder below is removed).
    mkdirSync(RUNS_DIR, { recursive: true })
    const runsDir = mkdtempSync(join(RUNS_DIR, '.test-live-scenes-'))
    repoDirs.push(runsDir)
    const answers = { what_matters: `${claudeSource('what_matters')}export const wrong: number = 'text'\n` }

    // Act
    const { events } = await runWithScenes({ answers, step: { typecheck: undefined }, runsDir })

    // Assert
    expect(reasonOf(events, 'what_matters')).toMatch(/^tsc failed: src\/scenes\/WhatMattersScene\.tsx\(\d+,\d+\): error TS2322/)
    expect(sceneOf(events, 'first_step')?.status).toBe('ready')
    expect(sceneOf(events, 'what_changes')?.status).toBe('ready')
  }, 30_000)
})
