/// <reference types="node" />
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createJobStore, type Job } from '../jobs/job-store'
import { createApp } from './app'
import type { CaseSummary, SurveyInfo } from './types'

const store = createJobStore()
const started: Job[] = []
let server: Server
let base = ''

beforeAll(async () => {
  const app = createApp({ store, runsDir: '/nonexistent', startJob: (job) => started.push(job) })
  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, () => resolve(listening))
  })
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())))

const post = (path: string, body: unknown) =>
  fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

describe('API', () => {
  it('lists the four families with their adults only', async () => {
    const { cases } = (await (await fetch(`${base}/api/cases`)).json()) as { cases: CaseSummary[] }
    expect(cases).toHaveLength(4)
    expect(cases.find((c) => c.caseId === 'daniel-emily-johnson')).toMatchObject({
      family: 'Daniel & Emily',
      score: 52,
      people: [
        { id: 'daniel', name: 'Daniel' },
        { id: 'emily', name: 'Emily' },
      ],
    })
  })

  it('gives the survey options and defaults for one adult', async () => {
    const info = (await (await fetch(`${base}/api/cases/michael-carter/michael/survey`)).json()) as SurveyInfo
    expect(info).toMatchObject({ member: 'michael', name: 'Michael', partner: null })
    expect(info.options.map((option) => option.id)).not.toContain('college')
    expect(info.defaults.decisionStyle).toBe('ask_trusted')
  })

  it('answers 404 with a readable message for an unknown case', async () => {
    const res = await fetch(`${base}/api/cases/nobody/x/survey`)
    expect(res.status).toBe(404)
    expect(((await res.json()) as { error: string }).error).toContain('Unknown case')
  })

  it('starts a job and answers at once with its id', async () => {
    const res = await post('/api/jobs', { caseId: 'daniel-emily-johnson', member: 'daniel', answers: { nickname: 'Dan' } })
    expect(res.status).toBe(202)
    const { id } = (await res.json()) as { id: string }
    expect(started.at(-1)?.id).toBe(id)
    expect(started.at(-1)?.request.answers).toEqual({ nickname: 'Dan' })
  })

  it('rejects an invalid survey answer with 400', async () => {
    const res = await post('/api/jobs', { caseId: 'daniel-emily-johnson', member: 'daniel', answers: { explainLevel: 'expert' } })
    expect(res.status).toBe(400)
    expect(((await res.json()) as { error: string }).error).toContain('answers.explainLevel')
  })

  it('rejects a nickname that carries a figure not in the plan', async () => {
    const res = await post('/api/jobs', { caseId: 'daniel-emily-johnson', member: 'daniel', answers: { nickname: 'Dan 4500000' } })
    expect(res.status).toBe(400)
    expect(((await res.json()) as { error: string }).error).toContain('answers.nickname')
  })

  it('answers 400, not 500, to a body that is not JSON', async () => {
    const res = await fetch(`${base}/api/jobs`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' })
    expect(res.status).toBe(400)
  })

  it('answers 404, not 500, for a file that is not in runs/', async () => {
    expect((await fetch(`${base}/runs/nope/video.mp4`)).status).toBe(404)
  })

  it('rejects a child before creating a job', async () => {
    const before = started.length
    const res = await post('/api/jobs', { caseId: 'daniel-emily-johnson', member: 'oliver' })
    expect(res.status).toBe(404)
    expect(started).toHaveLength(before)
  })

  it('replays past events over SSE and closes when the job has finished', async () => {
    const job = store.create({ caseId: 'daniel-emily-johnson', member: 'daniel', answers: {} })
    store.emit(job.id, { type: 'progress', progress: 0.5, label: 'Rendering your video' })
    store.emit(job.id, { type: 'error', message: 'boom' })
    const res = await fetch(`${base}/api/jobs/${job.id}/events`)
    expect(res.headers.get('content-type')).toBe('text/event-stream')
    const text = await res.text()
    expect(text).toContain('event: progress\ndata: {"type":"progress","progress":0.5')
    expect(text).toContain('event: error\ndata: {"type":"error","message":"boom"}')
  })

  it('streams new events to a listener until the job is done', async () => {
    const job = store.create({ caseId: 'daniel-emily-johnson', member: 'daniel', answers: {} })
    const res = await fetch(`${base}/api/jobs/${job.id}/events`)
    setTimeout(() => store.emit(job.id, { type: 'error', message: 'later' }), 20)
    expect(await res.text()).toContain('"message":"later"')
  })
})
