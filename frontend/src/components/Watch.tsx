// The video, its chapters and the first-step card (SPEC §1). The backend always hands back a rendered MP4;
// chapters follow its clock (the active one is highlighted) and a click jumps to that moment.
import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import type { JobResult } from "../types";
import { FirstStep } from "./FirstStep";

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const at = (starts: number[], t: number) => Math.max(0, starts.findLastIndex((s) => s <= t + 0.001));

const LOAD_FAILED = "Couldn't load the video. It may have been removed from the server; answer the questions again to make a new one.";
const DEMO_LOAD_FAILED = "Couldn't load the video. Check your connection and reload the page to try again.";

/** In the demo (`demo`), nothing is kept in this browser and a failed load does not suggest a new video. */
export function Watch({ result, demo = false }: { result: JobResult; demo?: boolean }) {
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
        {!started && !failed && (
          <button className="start" type="button" onClick={toggle}>
            <span className="start-play" aria-hidden="true" />
            <span className="start-title">{result.name}'s video</span>
            <span className="start-sub">{clock(duration)} · made from your plan and your answers</span>
          </button>
        )}
      </div>

      <nav className="controls" aria-label="Playback">
        <button className="ctl ctl-main" type="button" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
          {playing ? <Pause className="ic" /> : <Play className="ic" />}
        </button>
        <div className="scrub" aria-hidden="true"><i style={{ width: `${Math.min(100, (t / duration) * 100)}%` }} /></div>
        <span className="time">{clock(t)} / {clock(duration)}</span>
      </nav>

      <div className="below">
        <section className="panel chapters" aria-label="Chapters">
          <h2 className="section-title">Chapters</h2>
          <ol>
            {result.chapters.map((c, k) => (
              <li key={k}>
                <button type="button" className={`chapter${k === chapter && started ? " on" : ""}`} aria-current={k === chapter && started ? "true" : undefined} onClick={() => seek(c.startSec)}>
                  <span className="ch-time">{clock(c.startSec)}</span>
                  <span className="ch-text"><b>{c.title}</b><span>{c.body}</span></span>
                </button>
              </li>
            ))}
          </ol>
        </section>
        <FirstStep result={result} onSeek={seek} remember={!demo} />
      </div>
    </>
  );
}
