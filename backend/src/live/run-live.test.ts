/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { VideoPropsSchema, type Script } from '@sherpas/shared'
import { afterEach, describe, expect, it } from 'vitest'
import type { LiveJobEvent } from '../api/live-types'
import { createJobStore } from '../jobs/job-store'
import { sceneStarts } from '../pipeline/job-result'
import type { RunClaude } from '../script/claude-cli'
import { MAX_HOOK_WORDS } from '../script/script-check'
import { danielCase } from '../script/script-fixtures.test-helper'
import { fillScriptPrompt } from '../script/script-prompt'
import { PROMPT_FILE, SYSTEM_PROMPT, writeScript } from '../script/write-script'
import {
  claudeScriptFor,
  createFakeClock,
  emily,
  eventOf,
  fakeRecorder,
  fallbackFor,
  logLines,
  missingClaude,
  removeTempDirs,
  runLive,
  settle,
  streamingClaude,
} from './live-fakes.test-helper'
import { HOOK_REMINDER, HOOK_REMINDER_WORDS, LIVE_SCRIPT_TIMEOUT_MS } from './stream-script'

afterEach(removeTempDirs)

const fallback = fallbackFor(emily)
const claudeScript = claudeScriptFor(fallback)
const answerOf = (script: unknown): string => JSON.stringify(script, null, 2)

/** Runs a Live run with Claude streaming `answer` and the fake voice. */
const runWith = async (answer: string, plan: Parameters<typeof streamingClaude>[2] = {}) => {
  const clock = createFakeClock()
  const claude = streamingClaude(answer, clock, plan)
  const voice = fakeRecorder()
  const run = await runLive(emily, { runClaude: claude.runClaude, recordScene: voice.recordScene, clock })
  return { ...run, claude, voice, script: JSON.parse(run.read('script.json')) as Script }
}

const liveReadyLine = (read: (file: string) => string): string =>
  logLines(read('log.txt')).find((line) => line.includes('] live-ready (')) ?? ''

const typesOf = (events: readonly LiveJobEvent[]): string[] =>
  events.filter((event) => event.type !== 'progress' && event.type !== 'step').map((event) => event.type)

describe('runLiveJob, happy path', () => {
  it('sends live-ready with 5 voiced timings, then page, then end', async () => {
    // Act
    const { events, job } = await runWith(answerOf(claudeScript))

    // Assert
    expect(typesOf(events)).toEqual(['live-ready', 'page', 'end'])
    const ready = eventOf(events, 'live-ready')?.ready
    expect(VideoPropsSchema.safeParse(ready?.props).success).toBe(true)
    expect(ready?.props.scenes.map((timing) => timing.audioFile?.split('/').at(-1))).toEqual(
      [1, 2, 3, 4, 5].map((n) => `scene-${n}.mp3`),
    )
    expect(ready).toMatchObject({ caseId: 'daniel-emily-johnson', member: 'emily', name: 'Emily', partner: 'Daniel' })
    expect(ready?.firstStep.title).toBe('Raise mortality coverage')
    expect(job?.status).toBe('done')
  })

  it("plays Claude's script, with the CTA in the survey's decision style", async () => {
    // Act
    const { events, script } = await runWith(answerOf({ ...claudeScript, cta: { type: 'wait', text: 'Show this to Daniel tonight.' } }))

    // Assert
    expect(script).toEqual(claudeScript)
    expect(eventOf(events, 'live-ready')?.ready.props.script.scenes).toEqual(claudeScript.scenes)
    expect(eventOf(events, 'page')?.page.cta).toEqual({ type: 'ask_trusted', text: 'Show this to Daniel tonight.' })
  })

  it('puts each chapter at the real start of its part and the facts behind the first step in page', async () => {
    // Act
    const { events } = await runWith(answerOf(claudeScript))

    // Assert
    const ready = eventOf(events, 'live-ready')?.ready
    const page = eventOf(events, 'page')?.page
    if (!ready) throw new Error('no live-ready event')
    expect(page?.chapters.map((chapter) => chapter.title)).toEqual(claudeScript.chapters.map((chapter) => chapter.title))
    expect(page?.chapters.map((chapter) => chapter.startSec)).toEqual(sceneStarts(ready.props.scenes))
    expect(page?.detail.length).toBeGreaterThan(0)
  })

  it('asks Sonnet with the normal script prompt and system prompt, streaming, within the limit', async () => {
    // Act
    const { claude, read } = await runWith(answerOf(claudeScript))

    // Assert
    const [call] = claude.calls
    expect(call.systemPrompt).toBe(SYSTEM_PROMPT)
    expect(call.prompt).toBe(read('script-prompt.md'))
    expect(call.options).toMatchObject({ model: 'sonnet', effort: 'low', timeoutMs: LIVE_SCRIPT_TIMEOUT_MS })
    expect(LIVE_SCRIPT_TIMEOUT_MS).toBeLessThanOrEqual(25_000)
    expect(typeof call.options?.onText).toBe('function')
  })

  it('ends the prompt sent to Claude, and script-prompt.md, with the hook reminder', async () => {
    // Act
    const { claude, read } = await runWith(answerOf(claudeScript))

    // Assert
    const [call] = claude.calls
    expect(call.prompt.endsWith(`\n\n${HOOK_REMINDER}`)).toBe(true)
    expect(read('script-prompt.md')).toContain(HOOK_REMINDER)
    expect(HOOK_REMINDER).toContain(`${HOOK_REMINDER_WORDS} words or fewer`)
    expect(HOOK_REMINDER_WORDS).toBeLessThan(MAX_HOOK_WORDS)
  })

  it('records each narration once, as soon as its scene closes, before the script has finished', async () => {
    // Arrange
    const answer = answerOf(claudeScript)
    let releaseChapters: (value?: unknown) => void = () => undefined
    const chaptersHeld = new Promise((resolve) => {
      releaseChapters = resolve
    })
    const clock = createFakeClock()
    const claude = streamingClaude(answer, clock, { holdFrom: { chars: answer.indexOf('"chapters"'), until: () => chaptersHeld } })
    const voice = fakeRecorder()
    const base = createJobStore<LiveJobEvent>()
    const store: typeof base = {
      ...base,
      emit: (id, event) => {
        base.emit(id, event)
        if (event.type === 'live-ready') releaseChapters()
      },
    }

    // Act
    const { events, read } = await runLive(emily, { runClaude: claude.runClaude, recordScene: voice.recordScene, clock, store })

    // Assert
    expect(voice.calls.map((call) => call.index).sort()).toEqual([0, 1, 2, 3, 4])
    expect(voice.calls.map((call) => call.narration)).toEqual(claudeScript.scenes.map((scene) => scene.narration))
    expect(typesOf(events)).toEqual(['live-ready', 'page', 'end'])
    // The chapters closed after the voices: live-ready carries the ones without Claude, page the final ones.
    expect(eventOf(events, 'live-ready')?.ready.props.script.chapters).toEqual(fallback.chapters)
    expect(liveReadyLine(read)).toContain(
      'in it: chapters 1, 2, 3, 4, 5 not closed yet, from the script without Claude; CTA not closed yet, from the script without Claude)',
    )
    expect(eventOf(events, 'page')?.page.chapters.map((chapter) => chapter.title)).toEqual(
      claudeScript.chapters.map((chapter) => chapter.title),
    )
  })

  it('moves the progress bar up only, and reaches 1 just before live-ready', async () => {
    // Act
    const { events } = await runWith(answerOf(claudeScript))

    // Assert
    const values = events.flatMap((event) => (event.type === 'progress' ? [event.progress] : []))
    expect(values).toEqual([...values].sort((left, right) => left - right))
    expect(values.length).toBeGreaterThanOrEqual(10)
    const readyAt = events.findIndex((event) => event.type === 'live-ready')
    expect(events[readyAt - 1]).toEqual({ type: 'progress', progress: 1, label: 'Your video is ready' })
  })

  it('reports the brief, script and voice steps with their normal labels', async () => {
    // Act
    const { events } = await runWith(answerOf(claudeScript))

    // Assert
    const steps = events.flatMap((event) => (event.type === 'step' ? [`${event.step}:${event.status}`] : []))
    expect(steps.slice(0, 4)).toEqual(['brief:running', 'brief:done', 'script:running', 'voice:running'])
    expect(steps).toEqual(expect.arrayContaining(['script:done', 'voice:done']))
    expect(events).toContainEqual({ type: 'step', step: 'script', label: 'Writing your script', status: 'running' })
  })

  it('writes the run folder: inputs, prompt, stream, merged script, voices, props and a timed log; no result or MP4', async () => {
    // Act
    const { folder, read } = await runWith(answerOf(claudeScript))

    // Assert
    const files = ['survey.json', 'brief.json', 'facts.ts', 'script-prompt.md', 'script-stream.txt', 'script.json', 'video-props.json', 'log.txt']
    const audio = [1, 2, 3, 4, 5].map((n) => `audio/scene-${n}.mp3`)
    expect([...files, ...audio].filter((file) => !existsSync(join(folder, file)))).toEqual([])
    expect(['result.json', 'video.mp4'].filter((file) => existsSync(join(folder, file)))).toEqual([])
    expect(read('script-stream.txt')).toBe(answerOf(claudeScript))
    expect(VideoPropsSchema.parse(JSON.parse(read('video-props.json'))).script).toEqual(claudeScript)
  })

  it('logs every step with the seconds since the job started', async () => {
    // Act
    const { read } = await runWith(answerOf(claudeScript))

    // Assert
    const live = logLines(read('log.txt')).filter((line) => line.startsWith('[live '))
    const expected = [
      /^\[live \+\d+\.\d+s\] script: asking Claude \(sonnet, effort low, prompt v2 \+ hook reminder, limit 25 s\)$/,
      /^\[live \+\d+\.\d+s\] script: scene 2 \(where_you_are\) closed, accepted$/,
      /^\[live \+\d+\.\d+s\] script: chapter 5 closed, accepted$/,
      /^\[live \+\d+\.\d+s\] script: CTA closed, accepted$/,
      /^\[live \+\d+\.\d+s\] voice: scene 3 recorded \(\d+\.\d\d s, from the proxy\) in \d+\.\d+ s$/,
      /^\[live \+\d+\.\d+s\] live-ready \(video \d+\.\d s; in it: .*CTA (from Claude|not closed yet, from the script without Claude)\)$/,
      /^\[live \+\d+\.\d+s\] page sent/,
      /^\[live \+\d+\.\d+s\] script: stream ended \(\d+ characters streamed\)$/,
    ]
    expect(expected.filter((pattern) => !live.some((line) => pattern.test(line)))).toEqual([])
  })
})

describe('runLiveJob, the stream in pieces', () => {
  /** Quotes, braces and brackets inside strings, which a naive reader would take for structure. */
  const tricky: Script = {
    ...claudeScript,
    scenes: claudeScript.scenes.map((scene, index) =>
      index === 2 ? { ...scene, visualIdea: 'A card that says "your {cover} [today]" \\ and a } brace' } : scene,
    ) as Script['scenes'],
    chapters: claudeScript.chapters.map((chapter, index) =>
      index === 1 ? { ...chapter, body: `${chapter.body} She asked: "what {if}?"` } : chapter,
    ) as Script['chapters'],
  }

  it('gives the same script for uneven chunks cut mid-string and mid-escape as for one piece', async () => {
    // Act
    const whole = await runWith(answerOf(tricky), { chunkSizes: [100_000] })
    const uneven = await runWith(answerOf(tricky), { chunkSizes: [1, 7, 2, 33, 3, 5, 64] })

    // Assert
    expect(uneven.script).toEqual(tricky)
    expect(uneven.script).toEqual(whole.script)
    expect(eventOf(uneven.events, 'page')?.page).toEqual(eventOf(whole.events, 'page')?.page)
  })

  it('reads the JSON inside Markdown fences, with prose before it', async () => {
    // Act
    const { script } = await runWith(`Here is the script.\n\`\`\`json\n${answerOf(claudeScript)}\n\`\`\`\n`)

    // Assert
    expect(script).toEqual(claudeScript)
  })
})

describe('runLiveJob, a part that fails its checks', () => {
  const withScene = (index: number, change: Partial<Script['scenes'][number]>): Script => ({
    ...claudeScript,
    scenes: claudeScript.scenes.map((scene, at) => (at === index ? { ...scene, ...change } : scene)) as Script['scenes'],
  })

  it.each([
    {
      why: 'an invented figure',
      index: 2,
      script: withScene(2, { narration: 'Your family would need $123,456,789 to be safe.' }),
      problem: /scene 3 \(what_matters\) closed, replaced: .*123,456,789/,
    },
    {
      why: 'a hook that is too long',
      index: 0,
      script: withScene(0, {
        narration: 'Emily, this is a very long hook that goes on and on and on, far past the twenty words a hook may ever have.',
      }),
      problem: /scene 1 \(hook\) closed, replaced: The hook has \d+ words/,
    },
    {
      why: 'an unknown factsUsed',
      index: 3,
      script: withScene(3, { factsUsed: ['MADE_UP_FACT'] }),
      problem: /scene 4 \(first_step\) closed, replaced: .*MADE_UP_FACT/,
    },
  ])('replaces only that scene by the one without Claude when it has $why', async ({ index, script, problem }) => {
    // Act
    const run = await runWith(answerOf(script))

    // Assert
    const expected = claudeScript.scenes.map((scene, at) => (at === index ? fallback.scenes[at] : scene))
    expect(run.script.scenes).toEqual(expected)
    expect(run.script.chapters).toEqual(claudeScript.chapters)
    expect(run.voice.calls.find((call) => call.index === index)?.narration).toBe(fallback.scenes[index].narration)
    expect(logLines(run.read('log.txt')).some((line) => problem.test(line))).toBe(true)
    expect(typesOf(run.events)).toEqual(['live-ready', 'page', 'end'])
  })

  it('replaces only the chapter or the CTA that carries a figure not in the facts', async () => {
    // Arrange
    const script: Script = {
      ...claudeScript,
      chapters: claudeScript.chapters.map((chapter, at) =>
        at === 4 ? { ...chapter, body: 'It adds $987,654 a year.' } : chapter,
      ) as Script['chapters'],
      cta: { type: 'ask_trusted', text: 'Send Daniel the $55,555 plan.' },
    }

    // Act
    const run = await runWith(answerOf(script))

    // Assert
    expect(run.script.chapters).toEqual([...claudeScript.chapters.slice(0, 4), fallback.chapters[4]])
    expect(run.script.cta).toEqual(fallback.cta)
    expect(run.script.scenes).toEqual(claudeScript.scenes)
  })

  it('replaces a scene that is not valid JSON or does not match the schema', async () => {
    // Arrange
    const answer = answerOf(withScene(1, { part: 'hook' } as never))

    // Act
    const run = await runWith(answer)

    // Assert
    expect(run.script.scenes[1]).toEqual(fallback.scenes[1])
    expect(logLines(run.read('log.txt')).some((line) => /scene 2 \(where_you_are\) closed, replaced: Schema: scenes\.1\.part/.test(line))).toBe(true)
  })
})

describe('runLiveJob, when the stream does not finish', () => {
  const answer = answerOf(claudeScript)
  const afterThirdScene = answer.indexOf('"part": "first_step"')

  it.each(['exit', 'limit'] as const)(
    'keeps the 3 scenes that closed and replaces the rest when the stream stops after them (%s)',
    async (as) => {
      // Act
      const run = await runWith(answer, { stopAt: { chars: afterThirdScene, as } })

      // Assert
      expect(run.script.scenes).toEqual([...claudeScript.scenes.slice(0, 3), ...fallback.scenes.slice(3)])
      expect(run.script.chapters).toEqual(fallback.chapters)
      expect(run.script.cta).toEqual(fallback.cta)
      expect(run.voice.calls.map((call) => call.index).sort()).toEqual([0, 1, 2, 3, 4])
      expect(typesOf(run.events)).toEqual(['live-ready', 'page', 'end'])
      expect(logLines(run.read('log.txt')).some((line) => /scene 4 \(first_step\) missing, replaced/.test(line))).toBe(true)
      expect(run.claude.calls).toHaveLength(1)
    },
  )

  it('plays the whole script without Claude when the CLI cannot start, and says why in the log', async () => {
    // Arrange
    const clock = createFakeClock()
    const voice = fakeRecorder()

    // Act
    const run = await runLive(emily, { runClaude: missingClaude, recordScene: voice.recordScene, clock })

    // Assert
    expect(JSON.parse(run.read('script.json'))).toEqual(fallback)
    expect(typesOf(run.events)).toEqual(['live-ready', 'page', 'end'])
    expect(run.events).toContainEqual({
      type: 'step',
      step: 'script',
      label: 'Writing your script',
      status: 'done',
      note: '11 of 11 parts written without Claude',
    })
    expect(run.read('log.txt')).toContain('stream failed: Could not start "claude"')
  })
})

describe('runLiveJob, failures', () => {
  it('fails with a clear error and no live-ready when a voice fails', async () => {
    // Arrange
    const clock = createFakeClock()
    const claude = streamingClaude(answerOf(claudeScript), clock)
    const voice = fakeRecorder({ failScene: 1 })

    // Act
    const run = await runLive(emily, { runClaude: claude.runClaude, recordScene: voice.recordScene, clock })

    // Assert
    expect(run.events.at(-1)).toEqual({ type: 'error', message: 'Recording the narration failed: scene 2: LLM_PROXY_KEY is not set' })
    expect(typesOf(run.events)).toEqual(['error'])
    expect(run.job?.status).toBe('failed')
    expect(run.read('log.txt')).toContain('voice: scene 2 failed: LLM_PROXY_KEY is not set')
  })

  it('stops before live-ready and records nothing more when the page goes away', async () => {
    // Arrange
    const clock = createFakeClock()
    const answer = answerOf(claudeScript)
    const controller = new AbortController()
    const claude = streamingClaude(answer, clock, {
      chunkSizes: [20],
      holdFrom: {
        chars: answer.indexOf('"what_matters"'),
        until: () => {
          controller.abort()
          return settle()
        },
      },
    })
    const voice = fakeRecorder()

    // Act
    const run = await runLive(emily, { runClaude: claude.runClaude, recordScene: voice.recordScene, clock, signal: controller.signal })

    // Assert
    expect(typesOf(run.events)).toEqual(['error'])
    expect(run.events.at(-1)).toEqual({ type: 'error', message: 'The page closed before the video was ready' })
    expect(voice.calls.map((call) => call.index)).toEqual([0, 1])
  })

  it('fails at the brief step for a child, without a run folder', async () => {
    // Arrange
    const clock = createFakeClock()

    // Act
    const run = await runLive({ ...emily, member: 'oliver' }, { runClaude: missingClaude, recordScene: fakeRecorder().recordScene, clock })

    // Assert
    expect(run.events.at(-1)).toMatchObject({ type: 'error', message: expect.stringContaining('Reading your plan failed') })
    expect(existsSync(run.folder)).toBe(false)
  })
})

/** A recorder whose voices wait for `go`, so the stream can reach a given point before live-ready. */
const voicesAfter = (go: Promise<unknown>) => {
  const voice = fakeRecorder()
  const recordScene: typeof voice.recordScene = async (...args) => {
    await go
    return voice.recordScene(...args)
  }
  return recordScene
}

describe('runLiveJob, chapters and CTA at live-ready, item by item', () => {
  it('carries the chapters already accepted and the CTA without Claude when only the CTA is still open', async () => {
    // Arrange
    const answer = answerOf(claudeScript)
    let releaseCta: (value?: unknown) => void = () => undefined
    const ctaHeld = new Promise((resolve) => {
      releaseCta = resolve
    })
    let reached: (value?: unknown) => void = () => undefined
    const streamAtCta = new Promise((resolve) => {
      reached = resolve
    })
    const clock = createFakeClock()
    const until = () => {
      reached()
      return ctaHeld
    }
    const claude = streamingClaude(answer, clock, { holdFrom: { chars: answer.indexOf('"cta"'), until } })
    const base = createJobStore<LiveJobEvent>()
    const store: typeof base = {
      ...base,
      emit: (id, event) => {
        base.emit(id, event)
        if (event.type === 'live-ready') releaseCta()
      },
    }

    // Act
    const { events, read } = await runLive(emily, { runClaude: claude.runClaude, recordScene: voicesAfter(streamAtCta), clock, store })

    // Assert
    const props = eventOf(events, 'live-ready')?.ready.props
    expect(props?.script.chapters.map((chapter) => chapter.title)).toEqual(claudeScript.chapters.map((chapter) => chapter.title))
    expect(props?.script.cta).toEqual(fallback.cta)
    expect(eventOf(events, 'page')?.page.cta.text).toBe(claudeScript.cta.text)
    expect(liveReadyLine(read)).toContain('in it: chapters 1, 2, 3, 4, 5 from Claude; CTA not closed yet, from the script without Claude)')
  })

  it('carries the whole final script when it is finished before the voices, and sends page right after', async () => {
    // Arrange
    let scriptDone: (value?: unknown) => void = () => undefined
    const scriptFinished = new Promise((resolve) => {
      scriptDone = resolve
    })
    const base = createJobStore<LiveJobEvent>()
    const store: typeof base = {
      ...base,
      emit: (id, event) => {
        base.emit(id, event)
        if (event.type === 'step' && event.step === 'script' && event.status === 'done') scriptDone()
      },
    }
    const recordScene = voicesAfter(scriptFinished)
    const clock = createFakeClock()
    const claude = streamingClaude(answerOf(claudeScript), clock)

    // Act
    const { events, read } = await runLive(emily, { runClaude: claude.runClaude, recordScene, clock, store })

    // Assert
    const props = eventOf(events, 'live-ready')?.ready.props
    expect(typesOf(events)).toEqual(['live-ready', 'page', 'end'])
    expect(props?.script.chapters.map((chapter) => chapter.title)).toEqual(claudeScript.chapters.map((chapter) => chapter.title))
    expect(props?.script.cta.text).toBe(claudeScript.cta.text)
    expect(eventOf(events, 'page')?.page.chapters.map((chapter) => chapter.title)).toEqual(
      claudeScript.chapters.map((chapter) => chapter.title),
    )
    expect(liveReadyLine(read)).toContain('in it: chapters 1, 2, 3, 4, 5 from Claude; CTA from Claude)')
  })

  it('names the chapters that were replaced apart from the ones still open', async () => {
    // Arrange
    const withFigure: Script = {
      ...claudeScript,
      chapters: claudeScript.chapters.map((chapter, index) =>
        index === 1 ? { ...chapter, body: `${chapter.body} It costs $987,654.` } : chapter,
      ) as Script['chapters'],
    }
    const answer = answerOf(withFigure)
    let release: (value?: unknown) => void = () => undefined
    const held = new Promise((resolve) => {
      release = resolve
    })
    let reached: (value?: unknown) => void = () => undefined
    const streamAtChapter4 = new Promise((resolve) => {
      reached = resolve
    })
    const until = () => {
      reached()
      return held
    }
    const clock = createFakeClock()
    const claude = streamingClaude(answer, clock, { holdFrom: { chars: answer.indexOf('"title": "Claude chapter 4"'), until } })
    const base = createJobStore<LiveJobEvent>()
    const store: typeof base = {
      ...base,
      emit: (id, event) => {
        base.emit(id, event)
        if (event.type === 'live-ready') release()
      },
    }

    // Act
    const { read } = await runLive(emily, { runClaude: claude.runClaude, recordScene: voicesAfter(streamAtChapter4), clock, store })

    // Assert
    expect(liveReadyLine(read)).toContain(
      'in it: chapters 1, 3 from Claude; chapter 2 replaced, from the script without Claude; ' +
        'chapters 4, 5 not closed yet, from the script without Claude; CTA not closed yet, from the script without Claude)',
    )
  })
})

describe('the hook reminder, outside the Live run', () => {
  it('is not in the normal script prompt (fillScriptPrompt and writeScript, as npm run dev uses them)', async () => {
    // Arrange
    const { brief, facts, script } = danielCase()
    const files = new Map<string, string>()
    const prompts: string[] = []
    const runClaude: RunClaude = async (prompt) => {
      prompts.push(prompt)
      return JSON.stringify(script)
    }
    const folder = { writeText: (name: string, text: string) => void files.set(name, text), writeJson: () => undefined, log: () => undefined }
    const filled = fillScriptPrompt(readFileSync(PROMPT_FILE, 'utf8'), brief, facts)

    // Act
    await writeScript({ brief, facts, folder, runClaude })

    // Assert
    expect(filled).not.toContain(HOOK_REMINDER)
    expect(prompts).toEqual([filled])
    expect(files.get('script-prompt.md')).toBe(filled)
  })
})
