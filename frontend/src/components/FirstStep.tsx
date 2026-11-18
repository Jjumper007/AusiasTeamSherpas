// "Your first step" (SPEC §1, §3): the main move from top_moves, shaped by how this person decides.
//   just_do_it      one big button, "takes about 10 minutes"
//   research_first  "Why this number?" with the exact figures behind the video
//   ask_trusted     "Send this to <partner>" / "to someone you trust"
//   wait            what waiting costs (from the plan) and a reminder
// "I did it" and "Remind me" are kept in this browser, with a simulated nudge.
import { useState } from "react";
import { Bell, Check, ChevronRight, Send } from "lucide-react";
import { store } from "../api";
import type { JobResult } from "../types";

export function FirstStep({ result, onSeek }: { result: JobResult; onSeek(t: number): void }) {
  const { firstStep: m, cta, caseId, member } = result;
  const lift = m.scoreAfter - m.scoreBefore;
  const [status, setStatus] = useState<string | null>(() => store.get<string>(caseId, member, "step"));
  const [toast, setToast] = useState<string | null>(null);

  const mark = (s: "done" | "remind") => {
    store.set(caseId, member, "step", s);
    setStatus(s);
    setToast(s === "done" ? "Nice. That's the next step on the trail. We'll check in on day 30." : "We'll nudge you on day 3.");
  };

  async function share() {
    const to = result.partner ?? "someone you trust";
    const data = { title: `${result.name}'s plan, in a minute`, text: `Can you watch this with me? First step: ${m.title}.`, url: location.href };
    try {
      if (navigator.share) { await navigator.share(data); setToast(`Sent. Decide it together with ${to}.`); return; }
      await navigator.clipboard.writeText(`${data.text} ${data.url}`);
      setToast(`Link copied. Send it to ${to}.`);
    } catch {
      /* the share sheet was closed */
    }
  }

  const matters = result.chapters[2];

  return (
    <section className={`panel first-step cta-${cta.type}`} aria-labelledby="fs-title">
      <p className="fs-kicker">Your first step</p>
      <h2 className="fs-title" id="fs-title">{m.title}</h2>
      <p className="fs-meta">
        {lift > 0 ? <span className="lift">Score {m.scoreBefore} → {m.scoreAfter}</span> : <span className="lift neutral">Closes a gap the plan flags</span>}
        <span className="effort">{m.effort} effort</span>
      </p>
      <p className="fs-action">{m.action}</p>

      {cta.type === "just_do_it" && (
        <>
          <button type="button" className="cta-big" onClick={() => mark("done")}>
            <span>Start now</span><ChevronRight className="ic" />
          </button>
          <p className="fs-note">Takes about 10 minutes.</p>
        </>
      )}

      {cta.type === "research_first" && (
        <details className="why" open>
          <summary>Why this number?</summary>
          <p>{matters.body}</p>
          <dl>
            {result.detail.map((d) => (
              <div key={d.name}><dt>{d.label}</dt><dd>{d.value}</dd></div>
            ))}
          </dl>
          <p className="fs-links">
            <button type="button" className="link" onClick={() => onSeek(matters.startSec)}>See it in the video</button>
            <span aria-hidden="true">·</span>
            <span>Every figure comes from your Sherpas plan.</span>
          </p>
        </details>
      )}

      {cta.type === "ask_trusted" && (
        <button type="button" className="cta-big" onClick={share}>
          <Send className="ic" /><span>Send this to {result.partner ?? "someone you trust"}</span>
        </button>
      )}

      {cta.type === "wait" && (
        <div className="wait-cost">
          <p>
            {lift > 0
              ? <>Waiting keeps your score at <b>{m.scoreBefore}</b>. Taking this step lifts it to <b>{m.scoreAfter}</b>.</>
              : <>Waiting leaves the gap open: this step doesn't change the score, but the plan flags it.</>}
          </p>
          <button type="button" className="cta-big" onClick={() => mark("remind")}><Bell className="ic" /><span>Remind me</span></button>
        </div>
      )}

      <p className="fs-cta-text">{cta.text}</p>

      <div className="fs-actions">
        <button type="button" className={`pill${status === "done" ? " on" : ""}`} onClick={() => mark("done")} aria-pressed={status === "done"}>
          <Check className="ic" /> I did it
        </button>
        {cta.type !== "wait" && (
          <button type="button" className={`pill${status === "remind" ? " on" : ""}`} onClick={() => mark("remind")} aria-pressed={status === "remind"}>
            <Bell className="ic" /> Remind me
          </button>
        )}
      </div>
      {toast && <p className="toast" role="status">{toast}</p>}
    </section>
  );
}
