/// <reference types="node" />
import { writeFileSync } from 'node:fs'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp, type AppDeps } from '../api/app'
import type { DemoInfo, JobResult } from '../api/types'
import { createJobStore, type Job } from '../jobs/job-store'
import { addToDemo } from './demo-folder'
import { emilyRun, removeTempDirs, tempDir, writeRunFolder } from './demo-run.test-helper'

const emily = { caseId: 'daniel-emily-johnson', member: 'emily' }
const demoDir = tempDir('demo')
addToDemo(demoDir, emily, writeRunFolder(join(tempDir('run'), 'run'), emilyRun()))

const started: Job[] = []
const servers: Server[] = []

/** Starts an app on a free port and gives its base URL. */
const serve = async (extra: Partial<AppDeps>): Promise<string> => {
  const app = createApp({ store: createJobStore(), runsDir: '/nonexistent', startJob: (job) => started.push(job), ...extra })
  const server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, () => resolve(listening))
  })
  servers.push(server)
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`
}

let demo = ''
let normal = ''

beforeAll(async () => {
  demo = await serve({ demoDir })
  normal = await serve({})
})

afterAll(async () => {
  await Promise.all(servers.map((server) => new Promise<void>((resolve) => server.close(() => resolve()))))
  removeTempDirs()
})

const postJob = (base: string) =>
  fetch(`${base}/api/jobs`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ caseId: 'daniel-emily-johnson', member: 'emily' }),
  })

describe('demo mode', () => {
  it('says it is the demo and who has a video', async () => {
    const info = (await (await fetch(`${demo}/api/demo`)).json()) as DemoInfo

    expect(info).toEqual({ demo: true, people: [emily] })
  })

  it("gives a person's result with the video in the demo folder", async () => {
    const res = await fetch(`${demo}/api/demo/daniel-emily-johnson/emily`)
    const result = (await res.json()) as JobResult

    expect(res.status).toBe(200)
    expect(result).toMatchObject({ member: 'emily', videoUrl: '/demo/daniel-emily-johnson/emily/video.mp4' })
  })

  it('serves the demo video, with ranges for seeking', async () => {
    const res = await fetch(`${demo}/demo/daniel-emily-johnson/emily/video.mp4`, { headers: { range: 'bytes=0-3' } })

    expect(res.status).toBe(206)
    expect(res.headers.get('content-type')).toBe('video/mp4')
    expect(await res.text()).toBe('not ')
  })

  it('answers 404 for someone without a demo video', async () => {
    const res = await fetch(`${demo}/api/demo/daniel-emily-johnson/daniel`)

    expect(res.status).toBe(404)
    expect(((await res.json()) as { error: string }).error).toBe('No demo video for this person.')
  })

  it('answers 400 to ids that are not slugs', async () => {
    expect((await fetch(`${demo}/api/demo/..%2F..%2Fetc/passwd`)).status).toBe(400)
    expect((await fetch(`${demo}/api/demo/Daniel/emily`)).status).toBe(400)
  })

  it('does not serve files outside the demo folder or hidden ones', async () => {
    expect((await fetch(`${demo}/demo/..%2F..%2Fpackage.json`)).status).toBeGreaterThanOrEqual(400)
    expect((await fetch(`${demo}/demo/daniel-emily-johnson/emily/.video.mp4.partial`)).status).toBe(404)
  })

  it('answers 500 with a clear message for a broken result file', async () => {
    const brokenDir = tempDir('demo')
    addToDemo(brokenDir, emily, writeRunFolder(join(tempDir('run'), 'run'), emilyRun()))
    writeFileSync(join(brokenDir, emily.caseId, emily.member, 'result.json'), '{')
    const base = await serve({ demoDir: brokenDir })

    const res = await fetch(`${base}/api/demo/daniel-emily-johnson/emily`)

    expect(res.status).toBe(500)
    expect(((await res.json()) as { error: string }).error).toContain('result file is broken')
  })

  it('refuses to make a new video with 409 and never starts a job', async () => {
    const before = started.length
    const res = await postJob(demo)

    expect(res.status).toBe(409)
    expect(((await res.json()) as { error: string }).error).toBe('This is the demo: it plays videos made earlier.')
    expect(started).toHaveLength(before)
  })
})

describe('outside demo mode', () => {
  it('says it is not the demo', async () => {
    expect(await (await fetch(`${normal}/api/demo`)).json()).toEqual({ demo: false, people: [] })
  })

  it('has no demo results or videos', async () => {
    expect((await fetch(`${normal}/api/demo/daniel-emily-johnson/emily`)).status).toBe(404)
    expect((await fetch(`${normal}/demo/daniel-emily-johnson/emily/video.mp4`)).status).toBe(404)
  })

  it('still makes new videos', async () => {
    expect((await postJob(normal)).status).toBe(202)
  })
})
