// The demo (npm run demo, and the public link): the whole member experience with videos our pipeline
// made earlier. Prototype intro → the survey, locked to the demo answers → the run replay → the video.
// It reads demo.json only: no backend, and nothing kept in this browser.
import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { getDemoSite } from "../api";
import { Survey } from "../components/Survey";
import { Wait, type ProgressSource } from "../components/Wait";
import { Watch } from "../components/Watch";
import type { Answers, DemoMember } from "../types";
import { Intro } from "./Intro";
import { DEMO_NOTE, REPLAY_MS, replayTicks } from "./replay";

type Phase =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "intro" }
  | { kind: "survey"; member: DemoMember }
  | { kind: "wait"; member: DemoMember; origin: { x: number; y: number } | null }
  | { kind: "watch"; member: DemoMember };

const NO_MEMBERS = "This demo has no videos yet.";

/** Plays the member's run replay, then hands over their demo video. */
const replayOf = (member: DemoMember): ProgressSource => (on) => {
  const timers = [
    ...replayTicks(member.replay).map((tick) => setTimeout(() => on.progress({ progress: tick.progress, label: tick.label }), tick.atMs)),
    setTimeout(() => on.done(member.result), REPLAY_MS),
  ];
  return () => timers.forEach(clearTimeout);
};

export function DemoApp() {
  const [members, setMembers] = useState<readonly DemoMember[]>([]);
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getDemoSite()
      .then((site) => {
        if (site.members.length === 0) { setPhase({ kind: "error", message: NO_MEMBERS }); return; }
        setMembers(site.members);
        setPhase({ kind: "intro" });
      })
      .catch((e: Error) => setPhase({ kind: "error", message: `Couldn't load the demo (${e.message}). Reload the page to try again.` }));
  }, []);

  function surveyDone(member: DemoMember, from: HTMLElement | null) {
    const box = stage.current?.getBoundingClientRect(), r = from?.getBoundingClientRect();
    const origin = box && r ? { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top } : null;
    setPhase({ kind: "wait", member, origin });
  }

  const member = "member" in phase ? phase.member : null;

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="wordmark" role="img" aria-label="Sherpas" />
          <span className="feature">Plan in Motion</span>
        </div>
        {member && (
          <button className="chip-btn" type="button" onClick={() => setPhase({ kind: "intro" })}>
            <RotateCcw className="ic" /> Start over
          </button>
        )}
      </header>

      <main className={`theatre${phase.kind === "watch" ? " watching" : ""}`}>
        {phase.kind === "watch" ? (
          <Watch key={phase.member.result.runId} result={phase.member.result} demo />
        ) : (
          <div className="stage" ref={stage}>
            {phase.kind === "loading" && <p className="stage-msg">Loading…</p>}
            {phase.kind === "error" && <p className="stage-msg">{phase.message}</p>}
            {phase.kind === "intro" && <Intro members={members} onPick={(m) => setPhase({ kind: "survey", member: m })} />}
            {phase.kind === "survey" && (
              <Survey key={phase.member.result.runId} info={phase.member.survey} initial={{}} locked={phase.member.result.survey}
                onDone={(_answers: Answers, from) => surveyDone(phase.member, from)} />
            )}
            {phase.kind === "wait" && (
              <Wait key={phase.member.result.runId} source={replayOf(phase.member)} name={phase.member.result.name} doneLabel={DEMO_NOTE} remember={false}
                origin={phase.origin} onReady={() => setPhase({ kind: "watch", member: phase.member })} />
            )}
          </div>
        )}
        {/* The video starts loading as soon as a member is picked, while the survey and the replay play. */}
        {member && phase.kind !== "watch" && <video className="preload" src={member.result.videoUrl} preload="auto" muted playsInline aria-hidden="true" />}
      </main>
    </>
  );
}
