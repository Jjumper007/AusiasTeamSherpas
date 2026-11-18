// The video, its chapters and the first-step card (SPEC §1). With an MP4 from the renderer it plays that;
// until the video template renders, it plays the script as a preview on the same clock (voice clips when
// the backend recorded them), so chapters, seeking and the card already work end to end.
import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import type { JobResult } from "../types";
import { FirstStep } from "./FirstStep";

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const PART_LABEL: Record<string, string> = { hook: "For you", where: "Where you are", matters: "What matters most", step: "Your first step", change: "What changes" };
const at = (starts: number[], t: number) => Math.max(0, starts.findLastIndex((s) => s <= t + 0.001));

export function Watch({ result }: { result: JobResult }) {
  const video = useRef<HTMLVideoElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const duration = result.duration;
  const idx = at(result.scenes.map((s) => s.start), t);
  const scene = result.scenes[idx];
  const mp4 = Boolean(result.videoUrl);

  // Preview clock (no MP4): advances while playing.
  useEffect(() => {
    if (mp4 || !playing) return;
    let last = performance.now(), raf = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      setT((x) => Math.min(duration, x + dt));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [playing, duration, mp4]);
  useEffect(() => { if (!mp4 && t >= duration) setPlaying(false); }, [t, duration, mp4]);

  // The voice clip of the current scene, if there is one.
  useEffect(() => {
    const a = audio.current;
    if (!a || mp4) return;
    if (!scene.audioUrl || !playing) { a.pause(); return; }
    if (!a.src.endsWith(scene.audioUrl)) a.src = scene.audioUrl;
    a.currentTime = Math.max(0, t - scene.start);
    void a.play().catch(() => {});
  }, [idx, playing]); // eslint-disable-line react-hooks/exhaustive-deps

  function seek(to: number) {
    setStarted(true);
    if (video.current) { video.current.currentTime = to; void video.current.play(); return; }
    setT(to);
    setPlaying(true);
    if (audio.current && scene.audioUrl) audio.current.currentTime = Math.max(0, to - scene.start);
  }

  function toggle() {
    setStarted(true);
    const v = video.current;
    if (v) { v.paused ? void v.play() : v.pause(); return; }
    if (t >= duration - 0.05) setT(0);
    setPlaying((p) => !p);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest?.("input, select, textarea, button, summary, a")) return;
      if (e.key === " ") { e.preventDefault(); toggle(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const chapter = at(result.chapters.map((c) => c.start), t);

  return (
    <>
      <div className="stage">
        {mp4 ? (
          <video ref={video} className="mp4" src={result.videoUrl!} playsInline onClick={toggle}
            onTimeUpdate={(e) => setT(e.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
        ) : (
          started && <Preview result={result} idx={idx} t={t} />
        )}
        <audio ref={audio} preload="auto" />
        {!started && (
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
                <button type="button" className={`chapter${k === chapter && started ? " on" : ""}`} aria-current={k === chapter && started ? "true" : undefined} onClick={() => seek(c.start)}>
                  <span className="ch-time">{clock(c.start)}</span>
                  <span className="ch-text"><b>{c.title}</b><span>{c.body}</span></span>
                </button>
              </li>
            ))}
          </ol>
        </section>
        <FirstStep result={result} onSeek={seek} />
      </div>
    </>
  );
}

function Preview({ result, idx, t }: { result: JobResult; idx: number; t: number }) {
  const scene = result.scenes[idx];
  const chapter = result.chapters[idx];
  const fs = result.firstStep;
  return (
    <div className={`preview part-${scene.part}`}>
      <div className="progress" aria-hidden="true">
        {result.scenes.map((s, k) => (
          <span className="seg" key={k}><i style={{ width: `${k < idx ? 100 : k > idx ? 0 : Math.min(100, ((t - s.start) / s.seconds) * 100)}%` }} /></span>
        ))}
      </div>
      <div className="pv-body" key={idx}>
        <p className="pv-kicker">{PART_LABEL[scene.part] ?? chapter.title}</p>
        {scene.part === "where" && <p className="big pv-figure">{fs.before}</p>}
        {scene.part === "change" && fs.lift > 0 && (
          <p className="big pv-jump"><span className="from">{fs.before}</span><span className="arrow">→</span><span className="to">{fs.after}</span></p>
        )}
        <h2 className="pv-headline">{scene.part === "hook" ? chapter.body : scene.part === "step" ? fs.title : chapter.title}</h2>
      </div>
      <p className="caption">{scene.narration}</p>
      <p className="pv-note">Script preview · the animated video plays here once the video template renders</p>
    </div>
  );
}
