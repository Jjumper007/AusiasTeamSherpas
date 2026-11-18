import { describe, expect, it } from 'vitest'
import type { JobEvent, JobRequest, JobResult } from '../api/types'
import { createJobStore, JOB_TTL_MS } from './job-store'

const request: JobRequest = { caseId: 'daniel-emily-johnson', member: 'daniel', answers: {} }
const result = { runId: 'r' } as JobResult

describe('createJobStore', () => {
  it('creates a running job with a short id', () => {
    const store = createJobStore()
    const job = store.create(request)
    expect(job.id).toHaveLength(8)
    expect(store.get(job.id)).toMatchObject({ status: 'running', events: [], request })
    expect(store.runningCount()).toBe(1)
  })

  it('keeps only the latest progress tick in the backlog', () => {
    const store = createJobStore()
    const { id } = store.create(request)
    const step: JobEvent = { type: 'step', step: 'brief', label: 'Reading your plan', status: 'running' }
    store.emit(id, { type: 'progress', progress: 0.1, label: 'a' })
    store.emit(id, step)
    store.emit(id, { type: 'progress', progress: 0.2, label: 'b' })
    expect(store.get(id)?.events).toEqual([step, { type: 'progress', progress: 0.2, label: 'b' }])
  })

  it('marks the job done with its result, or failed on error', () => {
    const store = createJobStore()
    const ok = store.create(request)
    const bad = store.create(request)
    store.emit(ok.id, { type: 'done', result })
    store.emit(bad.id, { type: 'error', message: 'boom' })
    expect(store.get(ok.id)).toMatchObject({ status: 'done', result })
    expect(store.get(bad.id)?.status).toBe('failed')
    expect(store.runningCount()).toBe(0)
  })

  it('does not change the job object a caller already holds', () => {
    const store = createJobStore()
    const job = store.create(request)
    store.emit(job.id, { type: 'error', message: 'boom' })
    expect(job.status).toBe('running')
    expect(job.events).toEqual([])
  })

  it('delivers new events to subscribers until they unsubscribe', () => {
    const store = createJobStore()
    const { id } = store.create(request)
    const seen: JobEvent[] = []
    const stop = store.subscribe(id, (event) => seen.push(event))
    store.emit(id, { type: 'progress', progress: 0.5, label: 'x' })
    stop()
    store.emit(id, { type: 'progress', progress: 0.6, label: 'y' })
    expect(seen).toEqual([{ type: 'progress', progress: 0.5, label: 'x' }])
  })

  it('drops finished jobs older than an hour when a new one is created, but keeps running ones', () => {
    let clock = 0
    const store = createJobStore(() => clock)
    const finished = store.create(request)
    const running = store.create(request)
    store.emit(finished.id, { type: 'done', result })
    clock = JOB_TTL_MS + 1
    store.create(request)
    expect(store.get(finished.id)).toBeUndefined()
    expect(store.get(running.id)?.status).toBe('running')
  })
})
