// The four questions (SPEC §3), one per page, inside the stage: a light Sherpas app screen.
// Beside them, the card of "your video" fills in with each answer. Skip passes over one question
// (the video uses its default); after the last one, onDone(answers, the element tapped).
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowLeft, ChartColumn, ChevronRight, Clock, CreditCard, GraduationCap, House, LifeBuoy,
  MessageSquareText, PencilLine, Search, Shield, Sprout, TreePalm, UserRound, UsersRound, Zap, ClipboardList,
} from "lucide-react";
import type { Answers, Decision, Explain, SurveyInfo } from "../types";

const EXPLAIN: Record<Explain, { label: string; sub: string; icon: ReactNode }> = {
  simple: { label: "Keep it simple", sub: "No jargon, fewer numbers", icon: <Sprout /> },
  straight: { label: "Straight talk", sub: "The plan, plainly", icon: <MessageSquareText /> },
  nerd: { label: "Nerd mode", sub: "Every number, exact", icon: <ChartColumn /> },
};

const WORRY_ICONS: Record<string, ReactNode> = {
  retire: <TreePalm />, home: <House />, college: <GraduationCap />, cushion: <LifeBuoy />, card: <CreditCard />, protection: <Shield />,
};

const decisions = (partner: string | null): Record<Decision, { label: string; sub: string; icon: ReactNode }> => ({
  just_do_it: { label: "I just do it", sub: "Give me the one button", icon: <Zap /> },
  research_first: { label: "I research first", sub: "Show me the why behind each number", icon: <Search /> },
  ask_trusted: { label: partner ? `I talk it over with ${partner}` : "I ask someone I trust", sub: "Make it easy to share", icon: <UsersRound /> },
  wait: { label: "I wait until I'm sure", sub: "Remind me later", icon: <Clock /> },
});

type PageId = "name" | "explain" | "worry" | "decision";
interface Option { value: string; label: string; sub?: string; icon: ReactNode }

const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function Survey({ info, initial, onDone }: { info: SurveyInfo; initial: Answers; onDone(a: Answers, from: HTMLElement | null): void }) {
  const [answers, setAnswers] = useState<Answers>(initial);
  const [at, setAt] = useState(0);
  const [dir, setDir] = useState(1);
  const [skipped, setSkipped] = useState<Set<PageId>>(new Set());
  const [other, setOther] = useState(false);
  const finished = useRef(false);
  const name = answers.nickname || info.name;
  const D = decisions(info.partner);

  const pages = useMemo(() => {
    const all: { id: PageId; title: string; sub?: string; options: Option[]; custom?: boolean }[] = [
      { id: "name", title: `Hi ${info.name}. What should I call you?`, options: [] },
      { id: "explain", title: "How should I explain it?", options: (Object.keys(EXPLAIN) as Explain[]).map((v) => ({ value: v, ...EXPLAIN[v] })) },
      {
        id: "worry", title: `What's on your mind most, ${name}?`, sub: "These come from your plan.", custom: true,
        options: info.worries.map((w) => ({ value: w.id, label: w.label, icon: WORRY_ICONS[w.id] ?? <ClipboardList /> })),
      },
      { id: "decision", title: "When you make a big money decision, you…", options: (Object.keys(D) as Decision[]).map((v) => ({ value: v, ...D[v] })) },
    ];
    return all.filter((p) => p.id !== "worry" || info.worries.length > 0);
  }, [info, name]); // eslint-disable-line react-hooks/exhaustive-deps

  const page = pages[at];

  function next(a: Answers, from: HTMLElement | null) {
    setAnswers(a);
    setOther(false);
    setDir(1);
    if (at + 1 < pages.length) setAt(at + 1);
    else if (!finished.current) { finished.current = true; setAt(at + 1); onDone(a, from); }
  }

  function pick(value: string, from: HTMLElement | null) {
    if (finished.current) return;
    const a = { ...answers };
    if (page.id === "explain") a.explain = value as Explain;
    if (page.id === "worry") { a.worry = value; delete a.worryText; }
    if (page.id === "decision") a.decision = value as Decision;
    setSkipped((s) => { const n = new Set(s); n.delete(page.id); return n; });
    next(a, from);
  }

  function skip() {
    if (finished.current) return;
    const a = { ...answers };
    if (page.id === "name") delete a.nickname;
    if (page.id === "explain") delete a.explain;
    if (page.id === "worry") { delete a.worry; delete a.worryText; }
    if (page.id === "decision") delete a.decision;
    setSkipped((s) => new Set(s).add(page.id));
    next(a, null);
  }

  function back() {
    if (at === 0 || finished.current) return;
    setDir(-1);
    setOther(false);
    setAt(at - 1);
  }

  function submitName(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = String(new FormData(e.currentTarget).get("name") ?? "").trim().replace(/\s+/g, " ");
    if (!v) return;
    setSkipped((s) => { const n = new Set(s); n.delete("name"); return n; });
    next({ ...answers, nickname: v === info.name ? undefined : v }, e.currentTarget);
  }

  function submitOther(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = String(new FormData(e.currentTarget).get("other") ?? "").trim().replace(/\s+/g, " ");
    if (!v) return;
    setSkipped((s) => { const n = new Set(s); n.delete("worry"); return n; });
    next({ ...answers, worry: "other", worryText: v }, e.currentTarget);
  }

  // 1-9 picks an option, so a keyboard demo is as fast as a thumb.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest?.("input, select") || finished.current) return;
      const n = Number(e.key);
      if (n >= 1 && page?.options[n - 1]) { e.preventDefault(); pick(page.options[n - 1].value, document.querySelectorAll<HTMLElement>(".ob-opt")[n - 1]); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // The recipe card: one line per answered question, in order.
  const lines: { icon: ReactNode; text: string }[] = [];
  for (const p of pages.slice(0, at)) {
    if (skipped.has(p.id)) continue;
    if (p.id === "name") lines.push({ icon: <UserRound />, text: name });
    if (p.id === "explain" && answers.explain) lines.push({ icon: EXPLAIN[answers.explain].icon, text: EXPLAIN[answers.explain].label });
    if (p.id === "worry" && answers.worry) {
      const w = info.worries.find((x) => x.id === answers.worry);
      lines.push(w ? { icon: WORRY_ICONS[w.id] ?? <ClipboardList />, text: w.label } : { icon: <PencilLine />, text: `“${answers.worryText}”` });
    }
    if (p.id === "decision" && answers.decision) lines.push({ icon: D[answers.decision].icon, text: D[answers.decision].label });
  }

  const shown = pages[Math.min(at, pages.length - 1)];
  const anim = reduced() ? "" : dir > 0 ? " ob-in" : " ob-in-back";

  return (
    <div className="onboard">
      <div className="ob-top">
        <button className="ob-back" type="button" onClick={back} style={{ visibility: at === 0 ? "hidden" : "visible" }}>
          <ArrowLeft className="ic" /> <span>Back</span>
        </button>
        <div className="ob-progress">
          <div className="ob-segs" aria-hidden="true">{pages.map((p, k) => <i key={p.id} className={k <= at ? "on" : ""} />)}</div>
          <span className="ob-count">{Math.min(at + 1, pages.length)} of {pages.length}</span>
        </div>
        <button className="ob-skip" type="button" onClick={skip} aria-label="Skip this question">
          <span>Skip</span> <ChevronRight className="ic" />
        </button>
      </div>

      <div className="ob-body">
        <section className="ob-page" aria-live="polite" key={`${shown.id}-${at}`}>
          <div className={`ob-head${anim}`}>
            <h1 className="ob-q">{shown.title}</h1>
            {shown.sub && <p className="ob-sub">{shown.sub}</p>}
          </div>

          {shown.id === "name" ? (
            <form className={`ob-custom ob-write${anim}`} onSubmit={submitName}>
              <input name="name" type="text" autoComplete="given-name" maxLength={24} defaultValue={answers.nickname || info.name} aria-label="Your name" autoFocus onFocus={(e) => e.currentTarget.select()} />
              <button className="solid" type="submit"><span>Continue</span><ChevronRight className="ic" /></button>
            </form>
          ) : (
            <>
              <div className="ob-opts">
                {shown.options.map((o, k) => (
                  <button key={o.value} type="button" className={`ob-opt${anim}`} style={{ animationDelay: `${k * 40}ms` }} onClick={(e) => pick(o.value, e.currentTarget)}>
                    <span className="ob-ic">{o.icon}</span>
                    <span className="l">{o.label}{o.sub && <small>{o.sub}</small>}</span>
                    <kbd className="ob-k" aria-hidden="true">{k + 1}</kbd>
                  </button>
                ))}
                {shown.custom && (
                  <button type="button" className={`ob-opt${anim}${other ? " picked" : ""}`} style={{ animationDelay: `${shown.options.length * 40}ms` }} onClick={() => setOther(true)}>
                    <span className="ob-ic"><PencilLine /></span><span className="l">Something else</span>
                    <kbd className="ob-k" aria-hidden="true">{shown.options.length + 1}</kbd>
                  </button>
                )}
              </div>
              {shown.custom && other && (
                <form className="ob-custom" onSubmit={submitOther}>
                  <input name="other" type="text" maxLength={120} placeholder="In your own words" aria-label="In your own words" autoFocus />
                  <button className="solid" type="submit">OK</button>
                </form>
              )}
            </>
          )}
        </section>

        <aside className="recipe" aria-label="Your video so far">
          <p className="recipe-title"><span className="yak-mark" aria-hidden="true" /><span>{name}'s video</span></p>
          <ul className="recipe-lines">
            {lines.map((l, k) => <li key={k} className={k === lines.length - 1 && !reduced() ? "ob-in" : ""}>{l.icon}<span>{l.text}</span></li>)}
          </ul>
        </aside>
      </div>
    </div>
  );
}
