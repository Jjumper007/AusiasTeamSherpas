/// <reference types="node" />
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import express from 'express'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { LiveSceneReport } from '../api/live-types'
import { savedSceneModulePath } from './scene-module-contract'
import { sceneModuleRoutes } from './scene-module-routes'
import { sceneReportLine, sceneReportRoutes, videoTime } from './scene-report-routes'

const RUN_ID = 'case-a/member/2026-11-19T10-33-06-094Z'
const JOB_ID = 'job-1'
const root = mkdtempSync(join(tmpdir(), 'sherpas-scene-routes-'))
const logged: string[] = []
let server: Server
let base = ''

beforeAll(async () => {
  mkdirSync(join(root, RUN_ID), { recursive: true })
  writeFileSync(join(root, RUN_ID, 'scene-what_matters.js'), 'export default () => null\n')
  const app = express()
    .use(express.json())
    .use(sceneModuleRoutes(root))
    .use(sceneReportRoutes((jobId) => (jobId === JOB_ID ? (line) => logged.push(line) : undefined)))
  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, () => resolve(listening))
  })
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
  rmSync(root, { recursive: true, force: true })
})

const report = (body: unknown, jobId = JOB_ID) =>
  fetch(`${base}/api/live/jobs/${jobId}/scene`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

describe('the saved scene module route', () => {
  it('serves the module a run saved for a part as uncached JavaScript, ignoring the query Vite adds', async () => {
    // Act
    const res = await fetch(`${base}${savedSceneModulePath(RUN_ID, 'what_matters')}?import`)

    // Assert
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/^text\/javascript/)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(await res.text()).toBe('export default () => null\n')
  })

  it('answers 404 for a part without a saved module, a part Claude never designs, or a run id that climbs out', async () => {
    // Act
    const statuses = await Promise.all(
      [
        savedSceneModulePath(RUN_ID, 'first_step'),
        savedSceneModulePath(RUN_ID, 'hook'),
        '/api/live/runs/case-a/..%2F..%2Fetc/x/scene-modules/what_matters.js',
      ].map(async (path) => (await fetch(`${base}${path}`)).status),
    )

    // Assert
    expect(statuses).toEqual([404, 404, 404])
  })
})

describe('sceneReportLine', () => {
  const swapped: LiveSceneReport = { part: 'what_matters', outcome: 'swapped', videoSec: 27.13, marginSec: 2.42, neededSec: 2 }

  it('says when a scene was swapped in and how long before its part', () => {
    // Act
    const line = sceneReportLine(swapped)

    // Assert
    expect(line).toBe('scene what_matters: swapped in at 0:27.1 of the video, 2.4 s before its part')
  })

  it('says why the Standard scene was kept: late, already started, a module that did not load', () => {
    // Act
    const lines = [
      sceneReportLine({ ...swapped, outcome: 'late', videoSec: 37.2, marginSec: 0.8 }),
      sceneReportLine({ ...swapped, outcome: 'started', videoSec: 71.04, marginSec: -3.1 }),
      sceneReportLine({ ...swapped, outcome: 'load-failed', detail: 'Failed to fetch' }),
    ]

    // Assert
    expect(lines).toEqual([
      'scene what_matters: kept the Standard scene: arrived at 0:37.2 of the video, 0.8 s before its part (needs 2.0 s)',
      'scene what_matters: kept the Standard scene: arrived at 1:11.0 of the video, 3.1 s after its part started',
      'scene what_matters: kept the Standard scene: the module failed to load at 0:27.1 of the video (Failed to fetch)',
    ])
  })

  it('says when a swapped-in scene threw while drawing', () => {
    // Act
    const line = sceneReportLine({ ...swapped, outcome: 'threw', videoSec: 33, detail: 'boom' })

    // Assert
    expect(line).toBe("scene what_matters: Claude's scene threw while drawing at 0:33.0 of the video; back to the Standard scene (boom)")
  })

  it('keeps a detail with line breaks on one line of the log', () => {
    // Act
    const line = sceneReportLine({ ...swapped, outcome: 'load-failed', detail: 'bad\n[live +1.0s] forged' })

    // Assert
    expect(line).toBe('scene what_matters: kept the Standard scene: the module failed to load at 0:27.1 of the video (bad [live +1.0s] forged)')
  })

  it('writes video times as minutes and tenths of a second', () => {
    // Act
    const times = [videoTime(0), videoTime(9.96), videoTime(65.3)]

    // Assert
    expect(times).toEqual(['0:00.0', '0:10.0', '1:05.3'])
  })
})

describe('the scene report route', () => {
  it("writes a valid report to the run's log", async () => {
    // Act
    const res = await report({ part: 'first_step', outcome: 'swapped', videoSec: 50, marginSec: 12.5, neededSec: 2 })

    // Assert
    expect(res.status).toBe(204)
    expect(logged.at(-1)).toBe('scene first_step: swapped in at 0:50.0 of the video, 12.5 s before its part')
  })

  it('refuses an unknown run, a part Claude never designs, or a report without its times', async () => {
    // Act
    const statuses = await Promise.all([
      report({ part: 'first_step', outcome: 'swapped', videoSec: 1, marginSec: 1, neededSec: 2 }, 'nope'),
      report({ part: 'hook', outcome: 'swapped', videoSec: 1, marginSec: 1, neededSec: 2 }),
      report({ part: 'first_step', outcome: 'swapped' }),
    ])

    // Assert
    expect(statuses.map((res) => res.status)).toEqual([404, 400, 400])
  })
})
