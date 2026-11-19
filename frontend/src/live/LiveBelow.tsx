// Under the Live run's video, once `page` has arrived: the chapters (a click jumps the Player to that part
// and plays; the active one follows the Player's clock) and the first-step card, with the same components
// and markup as the MP4 page. Nothing here is kept in this browser.
import { useMemo } from "react";
import type { LivePage } from "@sherpas/backend/src/api/live-types";
import { VIDEO } from "../../../video-template/src/locked/tokens";
import { Chapters } from "../components/Chapters";
import { FirstStep } from "../components/FirstStep";
import { firstStepOf, frameForSec } from "./live-page";
import type { LiveVideo } from "./use-live-run";

interface Props {
  video: LiveVideo;
  page: LivePage;
  /** The chapter playing now, or null before the video has started. */
  active: number | null;
  onSeek(frame: number): void;
}

export function LiveBelow({ video, page, active, onSeek }: Props) {
  const card = useMemo(() => firstStepOf(video.ready, page), [video.ready, page]);
  return (
    <div className="below">
      <Chapters chapters={page.chapters} active={active} onPick={(k) => onSeek(video.windows[k].fromFrame)} />
      <FirstStep result={card} onSeek={(sec) => onSeek(frameForSec(sec, page.chapters, video.windows, VIDEO.fps))} remember={false} />
    </div>
  );
}
