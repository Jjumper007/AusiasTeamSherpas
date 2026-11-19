/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { get, type ClientRequest, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { createApp } from '../api/app'
import type { LiveJobEvent } from '../api/live-types'
import { createJobStore } from '../jobs/job-store'
import type { RunClaude } from '../script/claude-cli'
import { createLiveJobs, type LiveJobs } from './live-jobs'
import {
  claudeScriptFor,
  createFakeClock,
  emily,
  fakeRecorder,
  fallbackFor,
  removeTempDirs,
  settle,
  streamingClaude,
  tempRunsDir,
} from './live-fakes.test-helper'

const answer = JSON.stringify(claudeScriptFor(fallbackFor(emily)), null, 2)
const servers: Server[] = []

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))))
  removeTempDirs()
})

/** A live server whose Claude streams until the first scene, then waits for `release()`. */
const startLiveServer = async (pageGoneGraceMs = 0) => {
  let release: () => void = () => undefined
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  const claude = streamingClaude(answer, createFakeClock(), { holdFrom: { chars: answer.indexOf('"where_you_are"'), until: () => held } })
  const runClaude: RunClaude = (...args) => claude.runClaude(...args)
  const store = createJobStore<LiveJobEvent>()
  const runsDir = tempRunsDir()
  const deps = { store, runClaude, recordScene: fakeRecorder().recordScene, runsDir, now: () => new Date() }
  const live: LiveJobs = createLiveJobs(deps, { pageGoneGraceMs })
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
  const startRun = async (): Promise<Response> => post('/api/jobs', emily)
  const openStream = (id: string) =>
    new Promise<ClientRequest>((resolve) => {
      const request = get(`${base}/api/jobs/${id}/events`, () => resolve(request))
    })
  return { base, post, startRun, openStream, release, live, store, runsDir }
}

describe('Live run jobs over HTTP', () => {
  it('answers 409 to a second run while one is playing', async () => {
    // Arrange
    const server = await startLiveServer()
    const first = await server.startRun()

    // Act
    const second = await server.startRun()

    // Assert
    expect(first.status).toBe(202)
    expect(second.status).toBe(409)
    expect(await second.json()).toEqual({ error: 'A live run is already playing' })
    server.release()
    await server.live.current()
  })

  it('frees the slot once live-ready and page are sent, and ends the stream with `end`', async () => {
    // Arrange
    const server = await startLiveServer()
    const { id } = (await (await server.startRun()).json()) as { id: string }
    const events = fetch(`${server.base}/api/jobs/${id}/events`).then((res) => res.text())

    // Act
    server.release()
    const text = await events
    const next = await server.startRun()

    // Assert
    expect(text).toContain('event: live-ready\n')
    expect(text).toContain('event: page\n')
    expect(text.trimEnd().endsWith('event: end\ndata: {"type":"end"}')).toBe(true)
    expect(next.status).toBe(202)
    server.release()
    await server.live.current()
  })

  it('frees the slot when the page closes its stream before live-ready', async () => {
    // Arrange
    const server = await startLiveServer()
    const { id } = (await (await server.startRun()).json()) as { id: string }
    const page = await server.openStream(id)

    // Act
    page.destroy()
    await server.live.current()
    const next = await server.startRun()

    // Assert
    expect(server.store.get(id)?.status).toBe('failed')
    expect(next.status).toBe(202)
    server.release()
    await server.live.current()
    await settle()
  })

  it('keeps the run when the page reconnects its stream within the grace time', async () => {
    // Arrange
    const RECONNECT_GRACE_MS = 2000
    const server = await startLiveServer(RECONNECT_GRACE_MS)
    const { id } = (await (await server.startRun()).json()) as { id: string }
    const first = await server.openStream(id)

    // Act
    first.destroy()
    const second = await server.openStream(id)
    server.release()
    await server.live.current()

    // Assert
    expect(server.store.get(id)?.status).toBe('done')
    expect(server.store.get(id)?.events.at(-1)).toEqual({ type: 'end' })
    second.destroy()
  })

  it("writes the browser's first-frame report to the run's log", async () => {
    // Arrange
    const server = await startLiveServer()
    const { id } = (await (await server.startRun()).json()) as { id: string }
    server.release()
    await server.live.current()

    // Act
    const res = await server.post(`/api/live/jobs/${id}/first-frame`, { browserSec: 19.14, sinceReadySec: 1.96, afterTap: false })

    // Assert
    expect(res.status).toBe(204)
    const ready = server.store.get(id)?.events.find((event) => event.type === 'live-ready')
    const runId = ready?.type === 'live-ready' ? ready.ready.runId : ''
    const log = readFileSync(join(server.runsDir, runId, 'log.txt'), 'utf8')
    expect(log).toMatch(/\[live \+\d+\.\ds\] first frame \(browser: 19\.1 s after submit, 2\.0 s after live-ready\)\n$/)
  })

  it('refuses a first-frame report for an unknown run or without a valid time', async () => {
    // Arrange
    const server = await startLiveServer()
    const { id } = (await (await server.startRun()).json()) as { id: string }

    // Act
    const unknown = await server.post('/api/live/jobs/nope/first-frame', { browserSec: 1 })
    const invalid = await server.post(`/api/live/jobs/${id}/first-frame`, { browserSec: -1 })

    // Assert
    expect(unknown.status).toBe(404)
    expect(invalid.status).toBe(400)
    server.release()
    await server.live.current()
  })
})
