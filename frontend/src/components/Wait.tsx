// The wait: the stage wipes to navy from the tapped answer, the yak runs, and the progress of the
// video fills the strip above the game: the real job (SSE from the backend) in the app, the run
// replay in the demo. When the video is ready the yak runs off and onReady(result) shows it.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { JobListeners } from "../api";
import { yakRun } from "../game/yakRun";
import type { JobResult, Progress } from "../types";

const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Where the progress comes from: starts it and returns a function that stops listening. */
export type ProgressSource<R = JobResult> = (on: JobListeners<R>) => () => void;

interface Props<R> {
  /** Started again by "Try again" after an error. */
  source: ProgressSource<R>;
  name: string;
  /** The line shown once the video is ready; "Your video is ready" by default. */
  doneLabel?: string;
  /** Keep the game's best distance in this browser; off in the demo. */
  remember?: boolean;
  /** Where the curtain opens from, in the stage's coordinates. */
  origin: { x: number; y: number } | null;
  /** The yak has run off and the wait starts fading out (the Live run starts its video under the fade). */
  onExit?(): void;
  onReady(r: R): void;
}

export function Wait<R = JobResult>({ source, name, doneLabel = "Your video is ready", remember = true, origin, onExit, onReady }: Props<R>) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState<Progress>({ progress: 0, label: "Reading your plan" });
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
    game.current = yakRun(canvas.current, { autorun: !reduced(), remember });
    return () => game.current?.stop();
  }, []);

  // The job, or its replay.
  useEffect(() => {
    let alive = true;
    setError(null);
    const stop = source({
      progress: (p) => alive && setProgress(p),
      error: (message) => alive && setError(message),
      done: async (r) => {
        if (!alive) return;
        setProgress({ progress: 1, label: doneLabel });
        setReady(true);
        await game.current?.exit();
        if (alive) onExit?.();
        if (!reduced()) await root.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, delay: 350, easing: "ease-out", fill: "forwards" }).finished;
        if (alive) onReady(r);
      },
    });
    return () => { alive = false; stop(); };
  }, [attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  const pct = Math.round(progress.progress * 100);

  return (
    <div className="wait" ref={root}>
      <canvas ref={canvas} className="yak-game" role="img" aria-label="Mini game while your video is generated: the Sherpas yak runs and jumps over rocks. Press Space or tap to jump." />
      <div className="wait-top">
        <div className="wait-row">
          <p className="wait-title"><span className="yak-mark" aria-hidden="true" /><span className="t">{ready ? `${name}'s video is ready` : `Generating ${name}'s video`}</span></p>
          <p className="wait-pct"><b>{pct}%</b></p>
        </div>
        <div className="wait-bar" role="progressbar" aria-label="Video generation" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <i style={{ width: `${pct}%` }} />
        </div>
        <div className="wait-row wait-sub">
          {error ? (
            <p className="wait-step wait-error">Couldn't generate the video: {error} <button type="button" className="link" onClick={() => setAttempt((n) => n + 1)}>Try again</button></p>
          ) : (
            <p className="wait-step">{progress.label}</p>
          )}
          <p className="wait-hint">Space or tap to jump the rocks</p>
        </div>
      </div>
      <span className="wordmark wait-brand" role="img" aria-label="Sherpas" />
      <p className="sr-only" aria-live="polite">{ready ? "Your video is ready. Starting now." : error ? `Couldn't generate the video: ${error}` : ""}</p>
    </div>
  );
}
