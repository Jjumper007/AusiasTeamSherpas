// "Your first step" (SPEC §1, §3): the main move from top_moves, shaped by how this person decides.
// What it shows per decision style lives in ../first-step-card.ts; this file only renders it.
// "I did it" and "Remind me" are kept in this browser, with a simulated nudge.
import { useState } from "react";
import { Bell, Check, ChevronRight, Send } from "lucide-react";
import { store } from "../api";
import { firstStepCard, toastFor, type PrimaryAction, type StepMark } from "../first-step-card";
import type { JobResult } from "../types";

const PRIMARY_ICON: Record<PrimaryAction["kind"], typeof Send> = { start: ChevronRight, share: Send, remind: Bell };

export function FirstStep({ result, onSeek }: { result: JobResult; onSeek(t: number): void }) {
  const { firstStep: m, cta, caseId, member } = result;
  const [status, setStatus] = useState<StepMark | null>(() => store.get<StepMark>(caseId, member, "step"));
  const card = firstStepCard(result, status);
  const [toast, setToast] = useState<string | null>(null);

  const mark = (s: StepMark) => {
    store.set(caseId, member, "step", s);
    setStatus(s);
    setToast(toastFor(s));
  };

  async function share() {
    const data = { title: `${result.name}'s plan, in a minute`, text: `Can you watch this with me? First step: ${m.title}.`, url: location.href };
    try {
      if (navigator.share) { await navigator.share(data); setToast(`Sent. Decide it together with ${card.shareTo}.`); return; }
      await navigator.clipboard.writeText(`${data.text} ${data.url}`);
      setToast(`Link copied. Send it to ${card.shareTo}.`);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return; // the share sheet was closed
      setToast(`Couldn't share from this browser. Copy the page address and send it to ${card.shareTo}.`);
    }
  }

  const act = (kind: PrimaryAction["kind"]) => {
    if (kind === "share") void share();
    else mark(kind === "start" ? "done" : "remind");
  };
  const matters = result.chapters[2];

  return (
    <section className={`panel first-step cta-${card.variant}`} aria-labelledby="fs-title">
      <h2 className="fs-title" id="fs-title">{card.heading}</h2>
      <p className="fs-meta">
        <span className={`lift${card.lifts ? "" : " neutral"}`}>{card.scoreLine}</span>
        <span className="effort">{m.effort} effort</span>
      </p>
      <p className="fs-action">{m.action}</p>

      {card.waitCost && (
        <div className="wait-cost">
          <p>{card.waitCost.score}</p>
          {card.waitCost.gap && <p>{card.waitCost.gap.label}: <b>{card.waitCost.gap.value}</b></p>}
        </div>
      )}

      {card.variant === "research_first" && matters && (
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

      {card.primary && <PrimaryButton action={card.primary} onClick={act} />}
      {card.note && <p className="fs-note">{card.note}</p>}

      <p className="fs-cta-text">{cta.text}</p>

      <div className="fs-actions">
        <button type="button" className={`pill${status === "done" ? " on" : ""}`} onClick={() => mark("done")} aria-pressed={status === "done"}>
          <Check className="ic" /> I did it
        </button>
        {card.remindPill && (
          <button type="button" className={`pill${status === "remind" ? " on" : ""}`} onClick={() => mark("remind")} aria-pressed={status === "remind"}>
            <Bell className="ic" /> Remind me
          </button>
        )}
      </div>
      {toast && <p className="toast" role="status">{toast}</p>}
    </section>
  );
}

/** The card's big button. "Start now" reads label then arrow; the others lead with their icon. */
function PrimaryButton({ action, onClick }: { action: PrimaryAction; onClick(kind: PrimaryAction["kind"]): void }) {
  const Icon = PRIMARY_ICON[action.kind];
  const icon = <Icon className="ic" />;
  const label = <span>{action.label}</span>;
  return (
    <button type="button" className="cta-big" onClick={() => onClick(action.kind)} aria-pressed={action.kind === "remind" ? action.pressed : undefined}>
      {action.kind === "start" ? <>{label}{icon}</> : <>{icon}{label}</>}
    </button>
  );
}
