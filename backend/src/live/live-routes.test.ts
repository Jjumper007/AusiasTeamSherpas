/// <reference types="node" />
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import express from 'express'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { CompileSceneInput, CompileSceneResult } from './compile-scene'
import { liveRoutes } from './live-routes'
import { sceneModulePath } from './scene-module-contract'

const RUN_ID = 'case-a/member/2026-11-18T21-21-12-658Z'
const root = mkdtempSync(join(tmpdir(), 'sherpas-live-routes-'))
const runsDir = join(root, 'runs')
const publicDir = join(root, 'public')
const compiled: CompileSceneInput[] = []
let server: Server
let base = ''

/** Compiles every scene but `what_changes`, which has a syntax error. */
const fakeCompile = async (input: CompileSceneInput): Promise<CompileSceneResult> => {
  compiled.push(input)
  return input.sceneFile.includes('WhatChanges')
    ? { ok: false, problems: ['scenes/WhatChangesScene.tsx:1:1: Unexpected "<"'], ms: 1 }
    : { ok: true, code: 'export default () => null\n', bytes: 26, ms: 2.25 }
}

beforeAll(async () => {
  mkdirSync(join(runsDir, RUN_ID, 'video-template', 'src'), { recursive: true })
  mkdirSync(join(publicDir, 'music'), { recursive: true })
  writeFileSync(join(publicDir, 'music', 'bed.mp3'), 'mp3')
  const app = express().use(liveRoutes({ runsDir, templatePublicDir: publicDir, compile: fakeCompile }))
  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, () => resolve(listening))
  })
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
  rmSync(root, { recursive: true, force: true })
})

describe('live routes', () => {
  it("serves a part's compiled scene of a run as an uncached JavaScript module with its compile time", async () => {
    const res = await fetch(`${base}${sceneModulePath(RUN_ID, 'what_matters')}`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/^text\/javascript/)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(res.headers.get('server-timing')).toBe('compile;dur=2.3')
    expect(await res.text()).toBe('export default () => null\n')
    expect(compiled.at(-1)).toEqual({
      srcDir: join(runsDir, RUN_ID, 'video-template', 'src'),
      sceneFile: 'scenes/WhatMattersScene.tsx',
    })
  })

  it('answers 422 with the problems when the scene does not compile', async () => {
    const res = await fetch(`${base}${sceneModulePath(RUN_ID, 'what_changes')}`)
    expect(res.status).toBe(422)
    expect(await res.json()).toEqual({ error: 'The scene does not compile', problems: [expect.stringContaining('Unexpected')] })
  })

  it('answers 404 for an unknown part, an unknown run or a run id that climbs out of runs/', async () => {
    const before = compiled.length
    const paths = [
      `/api/live/runs/${RUN_ID}/scenes/not_a_part`,
      `/api/live/runs/case-a/member/other-stamp/scenes/hook`,
      '/api/live/runs/../member/stamp/scenes/hook',
      '/api/live/runs/%2E%2E/member/stamp/scenes/hook',
      '/api/live/runs/.hidden/member/stamp/scenes/hook',
    ]
    const statuses = await Promise.all(paths.map(async (path) => (await fetch(`${base}${path}`)).status))
    expect(statuses).toEqual(paths.map(() => 404))
    expect(compiled.length).toBe(before)
  })

  it("serves the template's public folder at the site root, where staticFile() points", async () => {
    const res = await fetch(`${base}/music/bed.mp3`)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('mp3')
  })
})
