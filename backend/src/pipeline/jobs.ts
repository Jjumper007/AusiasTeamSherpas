// Jobs live in a Map in memory (SPEC §5, no database). POST /jobs starts one in the background;
// GET /jobs/:id/events streams its events (SSE); a late subscriber first gets everything so far.
import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import type { JobRequest } from "../survey.js";
import type { JobResult } from "./run.js";

export type JobEvent =
  | { type: "step"; index: number; total: number; id: string; label: string; status: "running" | "done" | "skipped" | "failed"; note?: string }
  | { type: "progress"; p: number; step: string; left: number | null }
  | { type: "done"; result: JobResult }
  | { type: "error"; message: string };

export interface Job {
  id: string;
  request: JobRequest;
  status: "running" | "done" | "error";
  createdAt: number;
  events: JobEvent[];
  result?: JobResult;
  bus: EventEmitter;
}

const jobs = new Map<string, Job>();

export function createJob(request: JobRequest): Job {
  const job: Job = { id: randomUUID().slice(0, 8), request, status: "running", createdAt: Date.now(), events: [], bus: new EventEmitter() };
  jobs.set(job.id, job);
  // Keep memory bounded: drop jobs older than an hour.
  for (const [id, j] of jobs) if (Date.now() - j.createdAt > 3_600_000) jobs.delete(id);
  return job;
}

export const getJob = (id: string) => jobs.get(id);

export function emit(job: Job, e: JobEvent) {
  // Progress ticks are many and only the latest matters: keep one in the backlog.
  if (e.type === "progress") {
    const at = job.events.findIndex((x) => x.type === "progress");
    if (at >= 0) job.events.splice(at, 1);
  }
  job.events.push(e);
  if (e.type === "done") { job.status = "done"; job.result = e.result; }
  if (e.type === "error") job.status = "error";
  job.bus.emit("event", e);
}
