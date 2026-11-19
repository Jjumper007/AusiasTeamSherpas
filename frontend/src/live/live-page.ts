// What the Live run's page shows under the video, from `live-ready` and `page`, and where its chapters
// sit on the Player's clock. Pure, so it is unit-tested; LiveApp and LiveBelow only render it.
import type { LivePage, LiveReady } from "@sherpas/backend/src/api/live-types";
import type { FirstStepResult } from "../components/FirstStep";
import type { ChapterMark } from "../types";
import type { PartWindow } from "./player/part-clock";

/** The chapter playing at `frame`: the last part that has started, the first one during the opening logo. */
export const chapterAt = (windows: readonly PartWindow[], frame: number): number =>
  Math.max(0, windows.findLastIndex((window) => window.fromFrame <= frame));

/**
 * The frame to seek to for a time the first-step card asks for (it seeks by seconds, as on the MP4 page).
 * A chapter's own start goes to its part's exact first frame; the seconds are rounded to tenths.
 */
export const frameForSec = (sec: number, chapters: readonly ChapterMark[], windows: readonly PartWindow[], fps: number): number => {
  const chapter = chapters.findIndex((mark) => mark.startSec === sec);
  return windows[chapter]?.fromFrame ?? Math.max(0, Math.round(sec * fps));
};

/** The first-step card's data: what `live-ready` already knew plus the CTA, chapters and figures of `page`. */
export const firstStepOf = (ready: LiveReady, page: LivePage): FirstStepResult => ({
  caseId: ready.caseId,
  member: ready.member,
  name: ready.name,
  partner: ready.partner,
  firstStep: ready.firstStep,
  firstStepScore: ready.firstStepScore,
  waitGap: ready.waitGap,
  cta: page.cta,
  chapters: page.chapters,
  detail: page.detail,
});
