/// <reference types="node" />
import { writeFileSync } from 'node:fs'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { join } from 'node:path'
import express from 'express'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { addToDemo } from '../demo/demo-folder'
import { emilyRun, removeTempDirs, tempDir, writeRunFolder } from '../demo/demo-run.test-helper'
import { demoVideoPath, liveDemoRoutes } from './live-demo'

const EMILY = { caseId: 'daniel-emily-johnson', member: 'emily' }
const VIDEO_BYTES = 'not really a video'
const run = emilyRun()
let demoDir = ''
let server: Server
let base = ''

beforeAll(async () => {
  demoDir = tempDir('live-demo')
  addToDemo(demoDir, EMILY, writeRunFolder(join(tempDir('run'), 'run'), run))
  const app = express().use(liveDemoRoutes({ demoDir }))
  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, () => resolve(listening))
  })
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
  removeTempDirs()
})

describe('live Demo video routes', () => {
  it("answers a member's Demo video result with a videoUrl this server plays", async () => {
    // Act
    const res = await fetch(`${base}/api/live/demo/${EMILY.caseId}/${EMILY.member}`)

    // Assert
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ member: 'emily', name: run.result.name, chapters: run.result.chapters, durationSec: run.result.durationSec })
    expect(body.videoUrl).toBe(demoVideoPath(EMILY))
    expect(body.videoUrl).toBe('/api/live/demo/daniel-emily-johnson/emily/video.mp4')
  })

  it('serves the Demo video as an MP4 that the page can play from start to end', async () => {
    // Act
    const res = await fetch(`${base}${demoVideoPath(EMILY)}`)

    // Assert
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('video/mp4')
    expect(res.headers.get('accept-ranges')).toBe('bytes')
    expect(await res.text()).toBe(VIDEO_BYTES)
  })

  it('answers a range request with only those bytes, so the chapters can seek', async () => {
    // Act
    const res = await fetch(`${base}${demoVideoPath(EMILY)}`, { headers: { range: 'bytes=4-9' } })

    // Assert
    expect(res.status).toBe(206)
    expect(res.headers.get('content-range')).toBe(`bytes 4-9/${VIDEO_BYTES.length}`)
    expect(await res.text()).toBe(VIDEO_BYTES.slice(4, 10))
  })

  it('serves the MP4 when the Demo folder itself sits under a dot-folder (e.g. ~/.local/demo)', async () => {
    // Arrange
    const dottedDir = join(tempDir('live-demo-dotted'), '.hidden', 'demo')
    addToDemo(dottedDir, EMILY, writeRunFolder(join(tempDir('run'), 'run'), run))
    const app = express().use(liveDemoRoutes({ demoDir: dottedDir }))
    const dotted = await new Promise<Server>((resolve) => {
      const listening = app.listen(0, () => resolve(listening))
    })
    const url = `http://127.0.0.1:${(dotted.address() as AddressInfo).port}${demoVideoPath(EMILY)}`

    // Act
    const res = await fetch(url)
    const body = await res.text()
    await new Promise<void>((resolve) => dotted.close(() => resolve()))

    // Assert
    expect(res.status).toBe(200)
    expect(body).toBe(VIDEO_BYTES)
  })

  it('answers 404 for a member without a Demo video, for the result and for the MP4', async () => {
    // Act
    const statuses = await Promise.all(
      ['/api/live/demo/daniel-emily-johnson/michael', '/api/live/demo/daniel-emily-johnson/michael/video.mp4'].map(
        async (path) => (await fetch(`${base}${path}`)).status,
      ),
    )

    // Assert
    expect(statuses).toEqual([404, 404])
  })

  it('answers 404 for ids that are not slugs or climb out of the Demo folder, without reading anything', async () => {
    // Arrange
    const paths = [
      '/api/live/demo/../emily',
      '/api/live/demo/%2E%2E/emily',
      '/api/live/demo/daniel-emily-johnson/%2E%2E',
      '/api/live/demo/Daniel/emily',
      '/api/live/demo/daniel-emily-johnson/emily%2Fresult.json',
      '/api/live/demo/%2E%2E/%2E%2E/video.mp4',
      '/api/live/demo/daniel-emily-johnson/.hidden/video.mp4',
    ]

    // Act
    const answers = await Promise.all(paths.map(async (path) => fetch(`${base}${path}`)))

    // Assert
    expect(answers.map((res) => res.status)).toEqual(paths.map(() => 404))
  })

  it('answers 500 without the file when the result.json in the Demo folder is broken', async () => {
    // Arrange
    const brokenDir = tempDir('live-demo-broken')
    addToDemo(brokenDir, EMILY, writeRunFolder(join(tempDir('run'), 'run'), run))
    writeFileSync(join(brokenDir, EMILY.caseId, EMILY.member, 'result.json'), '{')
    const app = express().use(liveDemoRoutes({ demoDir: brokenDir }))
    const broken = await new Promise<Server>((resolve) => {
      const listening = app.listen(0, () => resolve(listening))
    })
    const url = `http://127.0.0.1:${(broken.address() as AddressInfo).port}/api/live/demo/${EMILY.caseId}/${EMILY.member}`

    // Act
    const res = await fetch(url)
    await new Promise<void>((resolve) => broken.close(() => resolve()))

    // Assert
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'The Demo video of this member cannot be read' })
  })
})
