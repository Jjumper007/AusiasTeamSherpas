import type { Answers, CaseSummary, JobResult, Progress, SurveyInfo } from "./types";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? `${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const getCases = () => fetch("/api/cases").then((r) => json<{ cases: CaseSummary[] }>(r)).then((d) => d.cases);

export const getSurvey = (caseId: string, member: string) => fetch(`/api/cases/${caseId}/${member}/survey`).then((r) => json<SurveyInfo>(r));

export async function startJob(caseId: string, member: string, a: Answers): Promise<string> {
  const survey = { nickname: a.nickname, explain: a.explain, worry: a.worry === "other" ? undefined : a.worry, decision: a.decision };
  const res = await fetch("/api/jobs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ caseId, member, survey }) });
  return (await json<{ id: string }>(res)).id;
}

/** Follows a job over SSE. Returns a function that stops listening. */
export function followJob(id: string, on: { progress(p: Progress): void; done(r: JobResult): void; error(message: string): void }): () => void {
  const es = new EventSource(`/api/jobs/${id}/events`);
  let finished = false;
  es.addEventListener("progress", (e) => on.progress(JSON.parse((e as MessageEvent).data)));
  es.addEventListener("done", (e) => { finished = true; es.close(); on.done(JSON.parse((e as MessageEvent).data).result); });
  es.addEventListener("error", (e) => {
    const data = (e as MessageEvent).data;
    if (data) { finished = true; es.close(); on.error(JSON.parse(data).message); return; }
    // A dropped connection: EventSource retries by itself; give up only once the job can't be found.
    if (!finished && es.readyState === EventSource.CLOSED) on.error("Lost the connection to the server.");
  });
  return () => es.close();
}

// ---------- per-person memory in this browser ----------

const key = (caseId: string, member: string, what: string) => `pim:${caseId}:${member}:${what}`;

export const store = {
  get<T>(caseId: string, member: string, what: string): T | null {
    try { return JSON.parse(localStorage.getItem(key(caseId, member, what)) ?? "null"); } catch { return null; }
  },
  set(caseId: string, member: string, what: string, v: unknown) {
    try { localStorage.setItem(key(caseId, member, what), JSON.stringify(v)); } catch { /* private mode: fine */ }
  },
};
