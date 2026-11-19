/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Part } from '@sherpas/shared'
import { afterEach, describe, expect, it } from 'vitest'
import type { LiveJobEvent } from '../api/live-types'
import { verifyRunFolder } from '../demo/run-files'
import { createJobStore } from '../jobs/job-store'
import { VIDEO_TEMPLATE_DIR } from '../paths'
import { listFiles } from '../scenes/sandbox'
import { createBrowserVerdicts, type BrowserVerdictsRecorder } from './browser-verdicts'
import {
  claudeScriptFor,
  createFakeClock,
  emily,
  fakeRecorder,
  fallbackFor,
  logLines,
  removeTempDirs,
  RUN_STAMP,
  streamingClaude,
  tempRunsDir,
} from './live-fakes.test-helper'
import { LIVE_RENDER_CONCURRENCY, PARTIAL_VIDEO_FILE } from './live-mp4'
import { claudeSource, fakeBundle, fakeRender, sceneStep } from './live-mp4-fakes.test-helper'
import { runLiveJob } from './run-live'
import { sceneFileOf } from './scene-module-contract'

afterEach(removeTempDirs)

const scriptAnswer = JSON.stringify(claudeScriptFor(fallbackFor(emily)), null, 2)
const runId = `${emily.caseId}/${emily.member}/${RUN_STAMP}`

interface Mp4Run {
  /** Parts whose Claude scene is not accepted. */
  readonly standard?: readonly Part[]
  readonly render?: ReturnType<typeof fakeRender>
  readonly bundle?: ReturnType<typeof fakeBundle>
  readonly browser?: BrowserVerdictsRecorder
  readonly signal?: AbortSignal
}

/** Starts a Live run with Claude's script and scenes and the background MP4; `done` resolves when it ends. */
const startMp4Run = ({ standard = [], render = fakeRender(), bundle = fakeBundle(), browser, signal }: Mp4Run = {}) => {
  const clock = createFakeClock()
  const store = createJobStore<LiveJobEvent>()
  const runsDir = tempRunsDir()
  const job = store.create(emily)
  const events: LiveJobEvent[] = []
  store.subscribe(job.id, (event) => events.push(event))
  const deps = {
    store,
    runClaude: streamingClaude(scriptAnswer, clock).runClaude,
    recordScene: fakeRecorder().recordScene,
    runsDir,
    now: clock.now,
    scenes: sceneStep(standard),
    mp4: { renderVideo: render.renderVideo, bundle: bundle.bundle },
  }
  const folder = join(runsDir, emily.caseId, emily.member, RUN_STAMP)
  const done = runLiveJob(job, deps, { signal, browser })
  const read = (file: string): string => readFileSync(join(folder, file), 'utf8')
  const has = (file: string): boolean => existsSync(join(folder, file))
  return { done, events, folder, read, has, render, bundle, job: () => store.get(job.id) }
}

const typesOf = (events: readonly LiveJobEvent[]): string[] =>
  events.filter((event) => event.type !== 'progress' && event.type !== 'step').map((event) => event.type)

/** The copy's sources that differ from the template's (tests are not copied). */
const differingSources = (copyDir: string): string[] => {
  const template = listFiles(join(VIDEO_TEMPLATE_DIR, 'src')).filter((key) => !/\.test\.tsx?$/.test(key))
  const copy = listFiles(join(copyDir, 'src'))
  expect(copy).toEqual(template)
  return copy.filter((key) => readFileSync(join(copyDir, 'src', key), 'utf8') !== readFileSync(join(VIDEO_TEMPLATE_DIR, 'src', key), 'utf8'))
}

describe('the background MP4 of a Live run that keeps it', () => {
  it('renders the final copy after the three scenes, keeps video.mp4 and result.json, and ends with done', async () => {
    // Arrange
    const run = startMp4Run()

    // Act
    await run.done

    // Assert
    const types = typesOf(run.events)
    expect(types.at(-1)).toBe('done')
    expect(types.filter((type) => type === 'scene')).toHaveLength(3)
    expect(types).not.toContain('end')
    expect(run.render.calls).toHaveLength(1)
    const [call] = run.render.calls
    expect(run.bundle.calls).toEqual([join(run.folder, 'video-template')])
    expect(call.options).toMatchObject({ serveUrl: `bundle:${join(run.folder, 'video-template')}`, concurrency: LIVE_RENDER_CONCURRENCY })
    expect(call.outputFile).toBe(join(run.folder, PARTIAL_VIDEO_FILE))
    expect(call.props).toEqual(JSON.parse(run.read('video-props.json')))
    expect(run.read('video.mp4')).toBe('complete mp4')
    expect(run.has(PARTIAL_VIDEO_FILE)).toBe(false)
    const done = run.events.at(-1)
    expect(done?.type === 'done' && done.result).toEqual(JSON.parse(run.read('result.json')))
    expect(JSON.parse(run.read('result.json')).videoUrl).toBe(`/runs/${runId}/video.mp4`)
    expect(run.job()?.status).toBe('done')
  })

  it("puts every accepted scene in the copy, and logs it in the normal run's format", async () => {
    // Arrange
    const run = startMp4Run()

    // Act
    await run.done

    // Assert
    expect(differingSources(join(run.folder, 'video-template'))).toEqual([
      sceneFileOf('first_step'),
      sceneFileOf('what_changes'),
      sceneFileOf('what_matters'),
    ])
    const lines = logLines(run.read('log.txt'))
    expect(lines).toContainEqual(expect.stringMatching(/render: scenes in the MP4: what_matters Claude's, first_step Claude's, what_changes Claude's$/))
    expect(lines).toContain("[render] video.mp4 written with Claude's scenes")
    expect(lines).toContainEqual(expect.stringMatching(/\] done: video\.mp4 and result\.json kept$/))
  })

  it('leaves a run folder that demo:check accepts', async () => {
    // Arrange
    const run = startMp4Run()

    // Act
    await run.done
    const report = verifyRunFolder(run.folder)

    // Assert
    expect(report.problems).toEqual([])
    expect(report.info).toContain("The video used Claude's scenes.")
  })

  it('changes only the accepted scene when the other two parts ended on their Standard scene', async () => {
    // Arrange
    const run = startMp4Run({ standard: ['what_matters', 'what_changes'] })

    // Act
    await run.done

    // Assert
    const copyDir = join(run.folder, 'video-template')
    expect(differingSources(copyDir)).toEqual([sceneFileOf('first_step')])
    expect(readFileSync(join(copyDir, 'src', sceneFileOf('first_step')), 'utf8')).toBe(claudeSource('first_step'))
    expect(logLines(run.read('log.txt'))).toContainEqual(
      expect.stringMatching(/scenes in the MP4: what_matters Standard \(no Claude scene accepted\), first_step Claude's, what_changes Standard/),
    )
  })

  it('renders the template itself, without a copy, when no Claude scene was accepted', async () => {
    // Arrange
    const run = startMp4Run({ standard: ['what_matters', 'first_step', 'what_changes'] })

    // Act
    await run.done

    // Assert
    expect(run.bundle.calls).toEqual([])
    expect(run.render.calls[0].options?.serveUrl).toBeUndefined()
    expect(run.has('video-template')).toBe(false)
    expect(logLines(run.read('log.txt'))).toContain('[render] video.mp4 written with the standard scenes')
    expect(verifyRunFolder(run.folder).problems).toEqual([])
  })

  it('leaves out a scene the page reported as thrown or failed to load', async () => {
    // Arrange
    const browser = createBrowserVerdicts()
    browser.record({ part: 'what_changes', outcome: 'threw' })
    browser.record({ part: 'what_matters', outcome: 'load-failed' })
    browser.record({ part: 'first_step', outcome: 'late' })
    const run = startMp4Run({ browser })

    // Act
    await run.done

    // Assert
    expect(differingSources(join(run.folder, 'video-template'))).toEqual([sceneFileOf('first_step')])
    expect(logLines(run.read('log.txt'))).toContainEqual(
      expect.stringMatching(
        /scenes in the MP4: what_matters Standard \(the page could not load it\), first_step Claude's, what_changes Standard \(it threw while drawing in the page\)$/,
      ),
    )
  })

  it('starts again without a scene the page refuses while the render runs', async () => {
    // Arrange
    const browser = createBrowserVerdicts()
    const render = fakeRender(['until-cancelled', 'finish'])
    const first = render.nextStart()
    const run = startMp4Run({ browser, render })

    // Act
    await first
    browser.record({ part: 'what_matters', outcome: 'threw' })
    await run.done

    // Assert
    expect(render.calls).toHaveLength(2)
    expect(render.calls[0].options?.signal?.aborted).toBe(true)
    expect(differingSources(join(run.folder, 'video-template'))).toEqual([sceneFileOf('first_step'), sceneFileOf('what_changes')])
    expect(typesOf(run.events).at(-1)).toBe('done')
    expect(logLines(run.read('log.txt'))).toContainEqual(expect.stringMatching(/render: the page refused what_matters, which was in the MP4: starting again without it$/))
  })
})

describe('the background MP4 of a Live run whose page closes', () => {
  it('cancels the render and keeps neither video.mp4 nor result.json', async () => {
    // Arrange
    const page = new AbortController()
    const render = fakeRender(['until-cancelled'])
    const started = render.nextStart()
    const run = startMp4Run({ render, signal: page.signal })

    // Act
    await started
    page.abort()
    await run.done

    // Assert
    expect(render.calls).toHaveLength(1)
    expect(render.calls[0].options?.signal?.aborted).toBe(true)
    expect(['video.mp4', 'result.json', PARTIAL_VIDEO_FILE].filter(run.has)).toEqual([])
    expect(typesOf(run.events)).not.toContain('done')
    expect(logLines(run.read('log.txt'))).toContainEqual(expect.stringMatching(/\] render: cancelled, the page closed \(stopped \d+\.\d s later\): no video\.mp4 or result\.json$/))
    expect(run.read('log.txt')).not.toContain('[render] video.mp4 written')
  })

  it('never starts the render when the page closes during the bundle', async () => {
    // Arrange
    const page = new AbortController()
    const bundle = fakeBundle({ held: true })
    const run = startMp4Run({ bundle, signal: page.signal })

    // Act
    await bundle.started
    page.abort()
    bundle.release()
    await run.done

    // Assert
    expect(run.render.calls).toEqual([])
    expect(['video.mp4', 'result.json'].filter(run.has)).toEqual([])
    expect(logLines(run.read('log.txt'))).toContainEqual(expect.stringMatching(/\] render: cancelled, the page closed/))
  })
})

describe('the background MP4 of a Live run whose render fails', () => {
  it('ends with end, not error, and writes no result.json', async () => {
    // Arrange
    const run = startMp4Run({ render: fakeRender(['fail']) })

    // Act
    await run.done

    // Assert
    const types = typesOf(run.events)
    expect(types.slice(0, 2)).toEqual(['live-ready', 'page'])
    expect(types).not.toContain('error')
    expect(types.at(-1)).toBe('end')
    expect(['video.mp4', 'result.json', PARTIAL_VIDEO_FILE].filter(run.has)).toEqual([])
    expect(logLines(run.read('log.txt'))).toContainEqual(expect.stringMatching(/\] render: failed: Chrome crashed: no video\.mp4 or result\.json$/))
    expect(run.job()?.status).toBe('done')
  })
})
