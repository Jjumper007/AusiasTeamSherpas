// The live web (npm run live): the normal survey, the wait with the yak and the Live run's real progress,
// then the video in the Player as soon as its 5 voices exist, with the chapters and the first-step card
// under it once they arrive. One single-page document from the survey to the video: the taps of the
// survey are what let the video start on its own with sound. Links: ?case=daniel-emily-johnson&person=emily
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import type { PlayerRef } from "@remotion/player";
import type { LiveReady } from "@sherpas/backend/src/api/live-types";
import type { Part } from "@sherpas/shared";
import { getSurvey } from "../api";
import { StartCard } from "../components/StartCard";
import { Survey } from "../components/Survey";
import { Wait } from "../components/Wait";
import type { Answers, SurveyInfo } from "../types";
import { LiveBelow } from "./LiveBelow";
import "./live.css";
import { LivePlayer } from "./player/LivePlayer";
import { STANDARD_SCENES, withStandardScene, type PageText } from "./player/scene-registry";
import { useActiveChapter, useLiveStart } from "./use-live-player";
import { useLiveRun } from "./use-live-run";
import { useLiveScenes } from "./use-live-scenes";
import { SafetyNetView } from "./SafetyNetView";
import { useSafetyNet } from "./use-safety-net";

type Phase =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "survey" }
  | { kind: "wait"; answers: Answers; origin: { x: number; y: number } | null }
  | { kind: "watch" };

const DEFAULT_CASE = "daniel-emily-johnson";
const DEFAULT_PERSON = "daniel";

const personFromUrl = (search: string) => {
  const params = new URLSearchParams(search);
  return { caseId: params.get("case") ?? DEFAULT_CASE, member: params.get("person") ?? DEFAULT_PERSON };
};

/** Where the wait's yak comes from: the centre of the button that finished the survey, in stage coordinates. */
const originIn = (stage: HTMLElement | null, from: HTMLElement | null) => {
  const box = stage?.getBoundingClientRect(), r = from?.getBoundingClientRect();
  return box && r ? { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top } : null;
};

/** Loads the survey once; the phase moves to the survey or to a clear error. */
function useSurveyInfo(caseId: string, member: string, setPhase: (phase: Phase) => void) {
  const [info, setInfo] = useState<SurveyInfo | null>(null);
  useEffect(() => {
    getSurvey(caseId, member)
      .then((survey) => {
        setInfo(survey);
        setPhase({ kind: "survey" });
      })
      .catch((e: Error) => setPhase({ kind: "error", message: `Can't load the survey (${e.message}). Is the live server running? npm run live` }));
  }, [caseId, member, setPhase]);
  return info;
}

function LiveHeader({ onStartOver }: { onStartOver?: () => void }) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="wordmark" role="img" aria-label="Sherpas" />
        <span className="feature">Plan in Motion</span>
      </div>
      {onStartOver && (
        <button className="chip-btn" type="button" onClick={onStartOver}>
          <RotateCcw className="ic" /> Start over
        </button>
      )}
    </header>
  );
}

export default function LiveApp() {
  const who = useMemo(() => personFromUrl(window.location.search), []);
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const info = useSurveyInfo(who.caseId, who.member, setPhase);
  /** The yak has run off: the video may start under the wait's fade. */
  const [leaving, setLeaving] = useState(false);
  const [scenes, setScenes] = useState(STANDARD_SCENES);
  const stage = useRef<HTMLDivElement>(null);
  const player = useRef<PlayerRef>(null);
  const net = useSafetyNet(who.caseId, who.member);
  const live = useLiveRun(who.caseId, who.member, net.watcher);
  useLiveScenes({ player, video: live.video, events: live.scenes, scenes, setScenes });
  const start = useLiveStart({ player, mounted: live.video !== null, canStart: leaving || phase.kind === "watch", onFirstFrame: live.onFirstFrame });
  const active = useActiveChapter(player, live.video?.windows);
  const pageText = useMemo<PageText | undefined>(() => (live.page ? { chapters: live.page.chapters, cta: live.page.cta } : undefined), [live.page]);
  const onSceneError = useCallback((part: Part) => setScenes((registry) => withStandardScene(registry, part)), []);

  function surveyDone(answers: Answers, from: HTMLElement | null) {
    setLeaving(false);
    setPhase({ kind: "wait", answers, origin: originIn(stage.current, from) });
  }

  function startOver() {
    net.reset();
    live.reset();
    setScenes(STANDARD_SCENES);
    setLeaving(false);
    setPhase({ kind: "survey" });
  }

  const video = live.video;

  // The safety net has fired: the Demo video with its notice, or the message. "Try again" mounts a new wait with the same answers.
  if (net.fired && phase.kind === "wait" && info) {
    const tryAgain = () => {
      net.reset();
      live.reset();
      setLeaving(false);
      setPhase({ ...phase, origin: null });
    };
    return (
      <>
        <LiveHeader onStartOver={startOver} />
        <main className="theatre watching live-theatre">
          <SafetyNetView view={net.view} demo={net.demo} name={phase.answers.nickname || info.name} onTryAgain={tryAgain} />
        </main>
      </>
    );
  }

  return (
    <>
      <LiveHeader onStartOver={phase.kind === "watch" ? startOver : undefined} />

      <main className="theatre watching live-theatre">
        <div className="stage" ref={stage}>
          {/* Mounted at live-ready, under the wait, and never remounted while it plays. */}
          {video && (
            <div className="live-player">
              <LivePlayer ref={player} videoProps={video.props} scenes={scenes} onSceneError={onSceneError} pageText={pageText} />
            </div>
          )}
          {phase.kind === "loading" && <p className="stage-msg">Loading…</p>}
          {phase.kind === "error" && <p className="stage-msg">{phase.message}</p>}
          {phase.kind === "survey" && info && <Survey key={`${who.caseId}/${who.member}`} info={info} initial={{}} onDone={surveyDone} />}
          {phase.kind === "wait" && info && (
            <Wait<LiveReady>
              source={live.sourceFor(phase.answers)}
              name={phase.answers.nickname || info.name}
              origin={phase.origin}
              onExit={() => setLeaving(true)}
              onReady={() => setPhase({ kind: "watch" })}
            />
          )}
          {video && start.needsTap && <StartCard name={video.ready.name} durationSec={video.ready.durationSec} onStart={start.tap} />}
        </div>
        {phase.kind === "watch" && video && live.page && (
          <LiveBelow video={video} page={live.page} active={start.started ? active : null} onSeek={start.seek} />
        )}
      </main>
    </>
  );
}
