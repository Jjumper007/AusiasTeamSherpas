/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { get, type ClientRequest, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { createApp } from '../api/app'
import type { LiveJobEvent } from '../api/live-types'
import { createJobStore } from '../jobs/job-store'
import { claudeScriptFor, emily, fakeRecorder, fallbackFor, removeTempDirs, streamingClaude, createFakeClock, tempRunsDir } from './live-fakes.test-helper'
import { createLiveJobs } from './live-jobs'
import { fakeBundle, fakeRender, sceneStep } from './live-mp4-fakes.test-helper'
import { sceneFileOf } from './scene-module-contract'

/** The live server with the background MP4 (#17), over HTTP: the slot, the stream as the session, the page's reports. */

const answer = JSON.stringify(claudeScriptFor(fallbackFor(emily)), null, 2)
const servers: Server[] = []

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))))
  removeTempDirs()
})

const startLiveServer = async (render: ReturnType<typeof fakeRender>) => {
  const store = createJobStore<LiveJobEvent>()
  const runsDir = tempRunsDir()
  const deps = {
    store,
    runClaude: streamingClaude(answer, createFakeClock()).runClaude,
    recordScene: fakeRecorder().recordScene,
    runsDir,
    now: () => new Date(),
    scenes: sceneStep(),
    mp4: { renderVideo: render.renderVideo, bundle: fakeBundle().bundle },
  }
  const live = createLiveJobs(deps, { pageGoneGraceMs: 0 })
  const app = createApp({
    store,
    runsDir,
    startJob: live.startJob,
    conflict: live.conflict,
    onStreamOpened: live.onStreamOpened,
    onStreamClosed: live.onStreamClosed,
    extraRoutes: [live.routes],
  })
  const server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, () => resolve(listening))
  })
  servers.push(server)
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  const post = (path: string, body: unknown) =>
    fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  const startRun = async (): Promise<string> => ((await (await post('/api/jobs', emily)).json()) as { id: string }).id
  const openStream = (id: string) =>
    new Promise<ClientRequest>((resolve) => {
      const request = get(`${base}/api/jobs/${id}/events`, () => resolve(request))
    })
  const runDirOf = (id: string): string => {
    const ready = store.get(id)?.events.find((event) => event.type === 'live-ready')
    return join(runsDir, ready?.type === 'live-ready' ? ready.ready.runId : 'none')
  }
  return { base, post, startRun, openStream, live, store, runDirOf }
}

describe('Live run jobs with the background MP4, over HTTP', () => {
  it('keeps the slot while the MP4 renders, then ends the stream with done', async () => {
    // Arrange
    const render = fakeRender(['until-cancelled', 'finish'])
    const server = await startLiveServer(render)
    const started = render.nextStart()
    const id = await server.startRun()
    const page = await server.openStream(id)
    await started

    // Act
    const during = await server.post('/api/jobs', emily)
    page.destroy()
    await server.live.current()
    const after = await server.post('/api/jobs', emily)

    // Assert
    expect(during.status).toBe(409)
    expect(after.status).toBe(202)
    const { id: secondId } = (await after.json()) as { id: string }
    const text = await fetch(`${server.base}/api/jobs/${secondId}/events`).then((res) => res.text())
    expect(text.trimEnd()).toMatch(/event: done\ndata: \{"type":"done","result":\{.*\}\}$/)
    expect(existsSync(join(server.runDirOf(secondId), 'result.json'))).toBe(true)
  })

  it('cancels the render when the page closes its stream: no video.mp4 or result.json, the slot is free', async () => {
    // Arrange
    const render = fakeRender(['until-cancelled'])
    const server = await startLiveServer(render)
    const started = render.nextStart()
    const id = await server.startRun()
    const page = await server.openStream(id)
    await started

    // Act
    page.destroy()
    await server.live.current()

    // Assert
    const runDir = server.runDirOf(id)
    expect(render.calls[0].options?.signal?.aborted).toBe(true)
    expect(['video.mp4', 'result.json'].filter((file) => existsSync(join(runDir, file)))).toEqual([])
    expect(server.store.get(id)?.events.at(-1)).toEqual({ type: 'end' })
    expect(readFileSync(join(runDir, 'log.txt'), 'utf8')).toMatch(/\] render: cancelled, the page closed/)
    expect(server.live.conflict()).toBeUndefined()
  })

  it("starts the MP4 again without a scene the page reports as thrown while it renders", async () => {
    // Arrange
    const render = fakeRender(['until-cancelled', 'finish'])
    const server = await startLiveServer(render)
    const started = render.nextStart()
    const id = await server.startRun()
    const page = await server.openStream(id)
    await started

    // Act
    const report = await server.post(`/api/live/jobs/${id}/scene`, { part: 'what_changes', outcome: 'threw', videoSec: 70, marginSec: -3, neededSec: 2 })
    await server.live.current()

    // Assert
    expect(report.status).toBe(204)
    expect(render.calls).toHaveLength(2)
    const copyScene = readFileSync(join(server.runDirOf(id), 'video-template', 'src', sceneFileOf('what_changes')), 'utf8')
    expect(copyScene).not.toContain('Designed by Claude')
    expect(server.store.get(id)?.events.at(-1)?.type).toBe('done')
    page.destroy()
  })
})
