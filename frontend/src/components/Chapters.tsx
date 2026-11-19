// The chapters under the video (SPEC §1): one per part, with its time; the active one is highlighted and a
// click asks the player to jump there. Shared by the MP4 page (Watch) and the Live run's page.
import type { ChapterMark } from "../types";

export const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

interface Props {
  chapters: readonly ChapterMark[];
  /** The chapter playing now, or null before the video has started. */
  active: number | null;
  onPick(index: number): void;
}

export function Chapters({ chapters, active, onPick }: Props) {
  return (
    <section className="panel chapters" aria-label="Chapters">
      <h2 className="section-title">Chapters</h2>
      <ol>
        {chapters.map((c, k) => (
          <li key={k}>
            <button type="button" className={`chapter${k === active ? " on" : ""}`} aria-current={k === active ? "true" : undefined} onClick={() => onPick(k)}>
              <span className="ch-time">{clock(c.startSec)}</span>
              <span className="ch-text"><b>{c.title}</b><span>{c.body}</span></span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
