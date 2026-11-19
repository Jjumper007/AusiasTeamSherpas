/// <reference types="node" />
import { randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'
import type { JobEvent, JobRequest, JobResult } from '../api/types'

/** Jobs live in memory only (SPEC §5): no database, lost on restart. */

export type JobStatus = 'running' | 'done' | 'failed'

/** What every job event has: its SSE event name. A normal job sends `JobEvent`s, a Live run `LiveJobEvent`s. */
export interface StoreEvent {
  readonly type: string
}

export interface Job<E extends StoreEvent = JobEvent> {
  readonly id: string
  readonly request: JobRequest
  readonly status: JobStatus
  readonly createdAt: number
  /** Every event so far, so a late subscriber can catch up. Only the latest progress tick is kept. */
  readonly events: ReadonlyArray<E>
  readonly result?: JobResult
}

export type JobListener<E extends StoreEvent = JobEvent> = (event: E) => void

export interface JobStore<E extends StoreEvent = JobEvent> {
  create(request: JobRequest): Job<E>
  get(id: string): Job<E> | undefined
  runningCount(): number
  emit(id: string, event: E): void
  /** Calls `listener` for every new event of the job. Returns the function that stops listening. */
  subscribe(id: string, listener: JobListener<E>): () => void
}

/** Jobs older than this are dropped when a new one is created, to keep memory bounded. */
export const JOB_TTL_MS = 60 * 60 * 1000
const ID_LENGTH = 8

/** `done` ends a normal job; `end` ends a Live run that has nothing more to send (api/live-types.ts). */
const DONE_EVENTS: ReadonlySet<string> = new Set(['done', 'end'])

/** After this event the job has nothing more to say: the SSE stream ends. */
export const isFinalEvent = (event: StoreEvent): boolean => DONE_EVENTS.has(event.type) || event.type === 'error'

const statusAfter = (status: JobStatus, event: StoreEvent): JobStatus => {
  if (DONE_EVENTS.has(event.type)) return 'done'
  if (event.type === 'error') return 'failed'
  return status
}

/** The result a `done` event carries, if this is one. */
const resultOf = (event: StoreEvent): JobResult | undefined =>
  event.type === 'done' ? (event as Extract<JobEvent, { type: 'done' }>).result : undefined

const eventsAfter = <E extends StoreEvent>(events: ReadonlyArray<E>, event: E): E[] =>
  event.type === 'progress' ? [...events.filter((past) => past.type !== 'progress'), event] : [...events, event]

export const createJobStore = <E extends StoreEvent = JobEvent>(now: () => number = Date.now): JobStore<E> => {
  const jobs = new Map<string, Job<E>>()
  const bus = new EventEmitter()
  bus.setMaxListeners(0)

  /** A job still running is kept whatever its age, so its listeners still get the end. */
  const dropExpired = (): void => {
    for (const [id, job] of jobs) {
      if (job.status !== 'running' && now() - job.createdAt > JOB_TTL_MS) jobs.delete(id)
    }
  }

  return {
    create(request) {
      dropExpired()
      const job: Job<E> = { id: randomUUID().slice(0, ID_LENGTH), request, status: 'running', createdAt: now(), events: [] }
      jobs.set(job.id, job)
      return job
    },
    get: (id) => jobs.get(id),
    runningCount: () => [...jobs.values()].filter((job) => job.status === 'running').length,
    emit(id, event) {
      const job = jobs.get(id)
      if (!job) return
      jobs.set(id, {
        ...job,
        status: statusAfter(job.status, event),
        events: eventsAfter(job.events, event),
        result: resultOf(event) ?? job.result,
      })
      bus.emit(id, event)
    },
    subscribe(id, listener) {
      bus.on(id, listener)
      return () => bus.off(id, listener)
    },
  }
}
