// The video, its chapters and the first-step card (SPEC §1). The backend always hands back a rendered MP4;
// chapters follow its clock (the active one is highlighted) and a click jumps to that moment.
import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import type { JobResult } from "../types";
import { Chapters, clock } from "./Chapters";
import { FirstStep } from "./FirstStep";
import { StartCard } from "./StartCard";

const at = (starts: number[], t: number) => Math.max(0, starts.findLastIndex((s) => s <= t + 0.001));

const LOAD_FAILED = "Couldn't load the video. It may have been removed from the server; answer the questions again to make a new one.";
const DEMO_LOAD_FAILED = "Couldn't load the video. Check your connection and reload the page to try again.";

/**
 * In the demo (`demo`), nothing is kept in this browser and a failed load does not suggest a new video.
 * `autoStart` (the Live run's safety net, when the browser allows sound) plays at once instead of showing
 * the start card; if the browser refuses, the start card shows.
 */
export function Watch({ result, demo = false, autoStart = false }: { result: JobResult; demo?: boolean; autoStart?: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);
  const duration = result.durationSec;

  function seek(to: number) {
    const v = video.current;
    if (!v) return;
    setStarted(true);
    v.currentTime = to;
    void v.play();
  }

  function toggle() {
    const v = video.current;
    if (!v) return;
    setStarted(true);
    if (v.paused) void v.play();
    else v.pause();
  }

  useEffect(() => {
    const v = video.current;
    if (!autoStart || !v) return;
    setStarted(true);
    v.play().catch(() => setStarted(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest?.("input, select, textarea, button, summary, a")) return;
      if (e.key === " ") { e.preventDefault(); toggle(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const chapter = at(result.chapters.map((c) => c.startSec), t);

  return (
    <>
      <div className="stage">
        <video ref={video} className="mp4" src={result.videoUrl} playsInline preload="metadata" onClick={toggle}
          onTimeUpdate={(e) => setT(e.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
          onError={() => setFailed(true)} />
        {failed && <p className="stage-msg">{demo ? DEMO_LOAD_FAILED : LOAD_FAILED}</p>}
        {!started && !failed && <StartCard name={result.name} durationSec={duration} onStart={toggle} />}
      </div>

      <nav className="controls" aria-label="Playback">
        <button className="ctl ctl-main" type="button" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
          {playing ? <Pause className="ic" /> : <Play className="ic" />}
        </button>
        <div className="scrub" aria-hidden="true"><i style={{ width: `${Math.min(100, (t / duration) * 100)}%` }} /></div>
        <span className="time">{clock(t)} / {clock(duration)}</span>
      </nav>

      <div className="below">
        <Chapters chapters={result.chapters} active={started ? chapter : null} onPick={(k) => seek(result.chapters[k].startSec)} />
        <FirstStep result={result} onSeek={seek} remember={!demo} />
      </div>
    </>
  );
}
