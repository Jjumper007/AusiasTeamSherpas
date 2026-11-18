import type { Answers, CaseSummary, DemoSite, JobEvent, JobResult, Progress, SurveyAnswers, SurveyInfo } from './types'

/** Reads a JSON response, turning an API error ({ error }) into an Error with its message. */
async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

export const getCases = (): Promise<CaseSummary[]> =>
  fetch('/api/cases')
    .then((r) => json<{ cases: CaseSummary[] }>(r))
    .then((d) => d.cases)

export const getSurvey = (caseId: string, member: string): Promise<SurveyInfo> =>
  fetch(`/api/cases/${encodeURIComponent(caseId)}/${encodeURIComponent(member)}/survey`).then((r) => json<SurveyInfo>(r))

/** The demo site's data (npm run demo:build writes it next to the app): everyone the demo can play. */
export const getDemoSite = (): Promise<DemoSite> => fetch('/demo.json').then((r) => json<DemoSite>(r))

/** Only the four answers are sent; a skipped one is left out and the backend uses its default. */
const toSurveyAnswers = ({ nickname, explainLevel, topOfMind, decisionStyle }: Answers): SurveyAnswers => ({
  nickname,
  explainLevel,
  topOfMind,
  decisionStyle,
})

export async function startJob(caseId: string, member: string, answers: Answers): Promise<string> {
  const res = await fetch('/api/jobs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ caseId, member, answers: toSurveyAnswers(answers) }),
  })
  return (await json<{ id: string }>(res)).id
}

export interface JobListeners {
  progress(p: Progress): void
  done(result: JobResult): void
  error(message: string): void
}

const parse = <T extends JobEvent['type']>(e: Event): Extract<JobEvent, { type: T }> =>
  JSON.parse((e as MessageEvent<string>).data)

/** Follows a job over SSE (GET /api/jobs/:id/events). Returns a function that stops listening. */
export function followJob(id: string, on: JobListeners): () => void {
  const es = new EventSource(`/api/jobs/${encodeURIComponent(id)}/events`)
  let finished = false
  const finish = () => {
    finished = true
    es.close()
  }
  es.addEventListener('progress', (e) => {
    const { progress, label } = parse<'progress'>(e)
    on.progress({ progress, label })
  })
  es.addEventListener('done', (e) => {
    finish()
    on.done(parse<'done'>(e).result)
  })
  // "error" is both the job's own error event (it has data) and EventSource's connection error (it has none).
  es.addEventListener('error', (e) => {
    if ((e as MessageEvent).data) {
      finish()
      on.error(parse<'error'>(e).message)
      return
    }
    if (!finished && es.readyState === EventSource.CLOSED) on.error('Lost the connection to the server.')
  })
  return () => es.close()
}

/** Starts a job and follows it until it is done. Returns a function that stops listening. */
export function runJob(caseId: string, member: string, answers: Answers, on: JobListeners): () => void {
  let alive = true
  let stop = () => {}
  startJob(caseId, member, answers)
    .then((id) => {
      if (alive) stop = followJob(id, on)
    })
    .catch((e: Error) => alive && on.error(e.message))
  return () => {
    alive = false
    stop()
  }
}

// ---------- per-person memory in this browser ----------

const key = (caseId: string, member: string, what: string) => `sherpas:v1:${caseId}:${member}:${what}`

export const store = {
  get<T>(caseId: string, member: string, what: string): T | null {
    try {
      return JSON.parse(localStorage.getItem(key(caseId, member, what)) ?? 'null') as T | null
    } catch {
      return null
    }
  },
  set(caseId: string, member: string, what: string, v: unknown): void {
    try {
      localStorage.setItem(key(caseId, member, what), JSON.stringify(v))
    } catch {
      // Private mode or full storage: the page still works, it just won't remember.
    }
  },
}
