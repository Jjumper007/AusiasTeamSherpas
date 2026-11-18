// The wait: the stage wipes to navy from the tapped answer, the yak runs, and the real progress of the
// job (SSE from the backend) fills the strip above the game. When the video is ready the yak runs off
// and onReady(result) shows it.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { followJob, startJob } from "../api";
import { yakRun } from "../game/yakRun";
import type { Answers, JobResult, Progress } from "../types";

const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

interface Props {
  caseId: string;
  member: string;
  answers: Answers;
  name: string;
  /** Where the curtain opens from, in the stage's coordinates. */
  origin: { x: number; y: number } | null;
  onReady(r: JobResult): void;
}

export function Wait({ caseId, member, answers, name, origin, onReady }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState<Progress>({ p: 0, step: "Reading your plan", left: null });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // The curtain: a circle from the tapped row to the whole stage.
  useLayoutEffect(() => {
    const el = root.current;
    if (!el || reduced()) return;
    const w = el.clientWidth, h = el.clientHeight;
    const cx = origin?.x ?? w / 2, cy = origin?.y ?? h / 2;
    const reach = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy)) + 2;
    el.animate([{ clipPath: `circle(0px at ${cx}px ${cy}px)` }, { clipPath: `circle(${reach}px at ${cx}px ${cy}px)` }], { duration: 750, easing: "cubic-bezier(0.87, 0, 0.13, 1)" });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The game runs for the whole wait.
  const game = useRef<ReturnType<typeof yakRun> | null>(null);
  useEffect(() => {
    if (!canvas.current) return;
    game.current = yakRun(canvas.current, { autorun: !reduced() });
    return () => game.current?.stop();
  }, []);

  // The job.
  useEffect(() => {
    let stop = () => {};
    let alive = true;
    setError(null);
    startJob(caseId, member, answers)
      .then((id) => {
        if (!alive) return;
        stop = followJob(id, {
          progress: setProgress,
          error: setError,
          done: async (r) => {
            setProgress({ p: 1, step: "Your video is ready", left: null });
            setReady(true);
            await game.current?.exit();
            if (!reduced()) await root.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, delay: 350, easing: "ease-out", fill: "forwards" }).finished;
            if (alive) onReady(r);
          },
        });
      })
      .catch((e: Error) => alive && setError(e.message));
    return () => { alive = false; stop(); };
  }, [attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  const pct = Math.round(progress.p * 100);
  const left = progress.left == null ? "" : progress.left > 0 ? ` · about ${progress.left} s left` : " · almost there";

  return (
    <div className="wait" ref={root}>
      <canvas ref={canvas} className="yak-game" role="img" aria-label="Mini game while your video is generated: the Sherpas yak runs a mountain trail. Press Space or tap to jump over the rocks." />
      <div className="wait-top">
        <div className="wait-row">
          <p className="wait-title"><span className="yak-mark" aria-hidden="true" /><span className="t">{ready ? `${name}'s video is ready` : `Generating ${name}'s video`}</span></p>
          <p className="wait-pct"><b>{pct}%</b><span>{error ? "" : left}</span></p>
        </div>
        <div className="wait-bar" role="progressbar" aria-label="Video generation" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <i style={{ width: `${pct}%` }} />
        </div>
        <div className="wait-row wait-sub">
          {error ? (
            <p className="wait-step wait-error">Couldn't generate the video: {error} <button type="button" className="link" onClick={() => setAttempt((n) => n + 1)}>Try again</button></p>
          ) : (
            <p className="wait-step">{progress.step}</p>
          )}
          <p className="wait-hint">Space or tap to jump the rocks</p>
        </div>
      </div>
      <span className="wordmark wait-brand" role="img" aria-label="Sherpas" />
      <p className="sr-only" aria-live="polite">{ready ? "Your video is ready. Starting now." : error ? `Couldn't generate the video: ${error}` : ""}</p>
    </div>
  );
}
