// The big play button over a video that has not started: the MP4 page shows it until the first play, the
// Live run's page when the browser would not play with sound on its own (no tap in this document yet).
import type { MouseEvent } from "react";
import { clock } from "./Chapters";

export function StartCard({ name, durationSec, onStart }: { name: string; durationSec: number; onStart(e: MouseEvent): void }) {
  return (
    <button className="start" type="button" onClick={onStart}>
      <span className="start-play" aria-hidden="true" />
      <span className="start-title">{name}'s video</span>
      <span className="start-sub">{clock(durationSec)} · made from your plan and your answers</span>
    </button>
  );
}
