/// <reference types="node" />
import { randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'
import type { JobEvent, JobRequest, JobResult } from '../api/types'

/** Jobs live in memory only (SPEC §5): no database, lost on restart. */

export type JobStatus = 'running' | 'done' | 'failed'

export interface Job {
  readonly id: string
  readonly request: JobRequest
  readonly status: JobStatus
  readonly createdAt: number
  /** Every event so far, so a late subscriber can catch up. Only the latest progress tick is kept. */
  readonly events: ReadonlyArray<JobEvent>
  readonly result?: JobResult
}

export type JobListener = (event: JobEvent) => void

export interface JobStore {
  create(request: JobRequest): Job
  get(id: string): Job | undefined
  runningCount(): number
  emit(id: string, event: JobEvent): void
  /** Calls `listener` for every new event of the job. Returns the function that stops listening. */
  subscribe(id: string, listener: JobListener): () => void
}

/** Jobs older than this are dropped when a new one is created, to keep memory bounded. */
export const JOB_TTL_MS = 60 * 60 * 1000
const ID_LENGTH = 8

const statusAfter = (status: JobStatus, event: JobEvent): JobStatus => {
  if (event.type === 'done') return 'done'
  if (event.type === 'error') return 'failed'
  return status
}

const eventsAfter = (events: ReadonlyArray<JobEvent>, event: JobEvent): JobEvent[] =>
  event.type === 'progress' ? [...events.filter((past) => past.type !== 'progress'), event] : [...events, event]

export const createJobStore = (now: () => number = Date.now): JobStore => {
  const jobs = new Map<string, Job>()
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
      const job: Job = { id: randomUUID().slice(0, ID_LENGTH), request, status: 'running', createdAt: now(), events: [] }
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
        result: event.type === 'done' ? event.result : job.result,
      })
      bus.emit(id, event)
    },
    subscribe(id, listener) {
      bus.on(id, listener)
      return () => bus.off(id, listener)
    },
  }
}
