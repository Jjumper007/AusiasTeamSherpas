// The Live run over HTTP: POST /api/jobs (same request as a normal job), then its SSE stream, which is
// the session: the server stops a run whose page closes the stream (and cancels its background MP4).
// So the page keeps it open while the video plays and the MP4 renders. The stream ends with `done`
// (the MP4 was kept) or `end` (nothing more to send); the page closes it then, so the browser's
// EventSource never reconnects to a finished run. Neither changes anything on screen.
import type { FirstFrameReport, LiveJobEvent, LivePage, LiveReady, LiveSceneEvent, LiveSceneReport } from "@sherpas/backend/src/api/live-types";
import { startJob } from "../api";
import type { Answers, Progress } from "../types";

export interface LiveListeners {
  progress(p: Progress): void;
  ready(ready: LiveReady): void;
  page(page: LivePage): void;
  /** Claude's design of one of parts 3–5 is resolved (#15). A reconnect replays it: the listener must not mind repeats. */
  scene?(event: LiveSceneEvent): void;
  error(message: string): void;
}

export interface LiveSession {
  /** The job's id, once the server has answered the POST. */
  jobId(): string | undefined;
  /** Stops listening and closes the stream (before `live-ready`, the server stops the run). */
  close(): void;
}

const LOST = "Lost the connection to the server.";

const data = <T extends LiveJobEvent["type"]>(e: Event): Extract<LiveJobEvent, { type: T }> =>
  JSON.parse((e as MessageEvent<string>).data);

/** Follows one Live run's events until `done`, `end` or `error`. */
const follow = (id: string, on: LiveListeners): EventSource => {
  const es = new EventSource(`/api/jobs/${encodeURIComponent(id)}/events`);
  let finished = false;
  // A reconnect replays every past event: the video's props must reach the page once only.
  let readySeen = false;
  const finish = () => {
    finished = true;
    es.close();
  };
  es.addEventListener("progress", (e) => {
    const { progress, label } = data<"progress">(e);
    on.progress({ progress, label });
  });
  es.addEventListener("live-ready", (e) => {
    if (readySeen) return;
    readySeen = true;
    on.ready(data<"live-ready">(e).ready);
  });
  es.addEventListener("page", (e) => on.page(data<"page">(e).page));
  es.addEventListener("scene", (e) => on.scene?.(data<"scene">(e)));
  es.addEventListener("end", finish);
  es.addEventListener("done", finish);
  // "error" is both the run's own error event (it has data) and EventSource's connection error (it has none).
  es.addEventListener("error", (e) => {
    if ((e as MessageEvent).data) {
      finish();
      on.error(data<"error">(e).message);
      return;
    }
    if (!finished && es.readyState === EventSource.CLOSED) on.error(LOST);
  });
  return es;
};

/** Starts a Live run and follows it. A second run while one is playing is refused (409) with a message. */
export function startLiveRun(caseId: string, member: string, answers: Answers, on: LiveListeners): LiveSession {
  let alive = true;
  let id: string | undefined;
  let es: EventSource | undefined;
  startJob(caseId, member, answers)
    .then((jobId) => {
      if (!alive) return;
      id = jobId;
      es = follow(jobId, on);
    })
    .catch((e: Error) => alive && on.error(e.message));
  return {
    jobId: () => id,
    close: () => {
      alive = false;
      es?.close();
    },
  };
}

/** Tells the server when the video started moving, for the run's log. */
export async function reportFirstFrame(jobId: string, report: FirstFrameReport): Promise<void> {
  const res = await fetch(`/api/live/jobs/${encodeURIComponent(jobId)}/first-frame`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(report),
  });
  if (!res.ok) throw new Error(`The first-frame report was refused (${res.status})`);
}

/** Tells the server what the page did with a Claude scene, for the run's log. */
export async function reportScene(jobId: string, report: LiveSceneReport): Promise<void> {
  const res = await fetch(`/api/live/jobs/${encodeURIComponent(jobId)}/scene`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(report),
  });
  if (!res.ok) throw new Error(`The scene report was refused (${res.status})`);
}
