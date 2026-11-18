// Plan in Motion: pick who is watching (production has a login), answer four questions, play the
// yak run while the backend generates the video, then watch it with chapters and the first step.
// Links: ?case=daniel-emily-johnson&person=emily
import { useEffect, useRef, useState } from "react";
import { UserPen } from "lucide-react";
import { getCases, getSurvey, store } from "./api";
import { Survey } from "./components/Survey";
import { Wait } from "./components/Wait";
import { Watch } from "./components/Watch";
import type { Answers, CaseSummary, JobResult, SurveyInfo } from "./types";

type Phase = { kind: "loading" } | { kind: "error"; message: string } | { kind: "survey" } | { kind: "wait"; answers: Answers; origin: { x: number; y: number } | null } | { kind: "watch"; result: JobResult };

export function App() {
  const params = new URLSearchParams(location.search);
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [who, setWho] = useState<{ caseId: string; member: string } | null>(null);
  const [info, setInfo] = useState<SurveyInfo | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const stage = useRef<HTMLDivElement>(null);

  // Families and adults.
  useEffect(() => {
    getCases()
      .then((cs) => {
        setCases(cs);
        const c = cs.find((x) => x.caseId === params.get("case")) ?? cs.find((x) => x.caseId === "daniel-emily-johnson") ?? cs[0];
        const p = c.people.find((x) => x.id === params.get("person")) ?? c.people[0];
        setWho({ caseId: c.caseId, member: p.id });
      })
      .catch((e: Error) => setPhase({ kind: "error", message: `Can't reach the API (${e.message}). Is it running? npm run dev` }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The person changed: their questions, and their last video if this browser has one.
  useEffect(() => {
    if (!who) return;
    history.replaceState(null, "", `?${new URLSearchParams({ case: who.caseId, person: who.member })}`);
    setPhase({ kind: "loading" });
    setInfo(null);
    getSurvey(who.caseId, who.member)
      .then((s) => {
        setInfo(s);
        const last = store.get<JobResult>(who.caseId, who.member, "result");
        setPhase(last ? { kind: "watch", result: last } : { kind: "survey" });
      })
      .catch((e: Error) => setPhase({ kind: "error", message: e.message }));
  }, [who]);

  const answers = who ? store.get<Answers>(who.caseId, who.member, "answers") ?? {} : {};

  function surveyDone(a: Answers, from: HTMLElement | null) {
    if (!who) return;
    store.set(who.caseId, who.member, "answers", a);
    const box = stage.current?.getBoundingClientRect(), r = from?.getBoundingClientRect();
    const origin = box && r ? { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top } : null;
    setPhase({ kind: "wait", answers: a, origin });
  }

  function ready(result: JobResult) {
    if (!who) return;
    store.set(who.caseId, who.member, "result", result);
    setPhase({ kind: "watch", result });
  }

  const asking = phase.kind === "survey" || phase.kind === "wait";

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="wordmark" role="img" aria-label="Sherpas" />
          <span className="feature">Plan in Motion</span>
        </div>
        <div className="pickers">
          <label className="pick">
            <span>Watching</span>
            <select
              aria-label="Who is watching"
              value={who ? `${who.caseId}/${who.member}` : ""}
              onChange={(e) => { const [caseId, member] = e.target.value.split("/"); setWho({ caseId, member }); }}
            >
              {cases.map((c) => (
                <optgroup key={c.caseId} label={`${c.family} · score ${c.score}`}>
                  {c.people.map((p) => <option key={p.id} value={`${c.caseId}/${p.id}`}>{p.name}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
          <button className="chip-btn" type="button" disabled={!info || asking} onClick={() => setPhase({ kind: "survey" })} title="Answer the four questions again">
            <UserPen className="ic" /> Personalize
          </button>
        </div>
      </header>

      <main className={`theatre${phase.kind === "watch" ? " watching" : ""}`}>
        {phase.kind === "watch" ? (
          <Watch key={phase.result.runId} result={phase.result} />
        ) : (
          <div className="stage" ref={stage}>
            {phase.kind === "loading" && <p className="stage-msg">Loading…</p>}
            {phase.kind === "error" && <p className="stage-msg">{phase.message}</p>}
            {phase.kind === "survey" && info && who && <Survey key={`${who.caseId}/${who.member}`} info={info} initial={answers} onDone={surveyDone} />}
            {phase.kind === "wait" && info && who && (
              <Wait caseId={who.caseId} member={who.member} answers={phase.answers} name={phase.answers.nickname || info.name} origin={phase.origin} onReady={ready} />
            )}
          </div>
        )}
      </main>
    </>
  );
}
