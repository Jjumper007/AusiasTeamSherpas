import { describe, expect, it } from "vitest";
import { videoPropsFixture } from "@sherpas/shared";
import type { LivePage, LiveReady } from "@sherpas/backend/src/api/live-types";
import { chapterAt, firstStepOf, frameForSec } from "./live-page";
import { partWindows } from "./player/part-clock";

const FPS = 30;
const windows = partWindows(videoPropsFixture, FPS);
const chapters = videoPropsFixture.script.chapters.map((chapter, index) => ({
  ...chapter,
  startSec: Math.round((windows[index].fromFrame / FPS) * 10) / 10,
}));

describe("chapterAt", () => {
  it("is the first chapter during the opening logo", () => {
    // Act
    const chapter = chapterAt(windows, 0);

    // Assert
    expect(chapter).toBe(0);
  });

  it("follows the part on screen, from its first frame to its last", () => {
    // Act
    const atStart = chapterAt(windows, windows[3].fromFrame);
    const atEnd = chapterAt(windows, windows[3].toFrame - 1);

    // Assert
    expect([atStart, atEnd]).toEqual([3, 3]);
  });

  it("stays on the last chapter during the closing logo", () => {
    // Act
    const chapter = chapterAt(windows, windows[4].toFrame + 60);

    // Assert
    expect(chapter).toBe(4);
  });
});

describe("frameForSec", () => {
  it("goes to the exact first frame of a chapter's part, whatever the rounding of its start", () => {
    // Act
    const frame = frameForSec(chapters[2].startSec, chapters, windows, FPS);

    // Assert
    expect(frame).toBe(windows[2].fromFrame);
  });

  it("rounds any other time to the nearest frame", () => {
    // Act
    const frame = frameForSec(1.5, chapters, windows, FPS);

    // Assert
    expect(frame).toBe(45);
  });
});

describe("firstStepOf", () => {
  it("joins what live-ready knew with the CTA, chapters and figures of page", () => {
    // Arrange
    const ready = {
      caseId: "daniel-emily-johnson",
      member: "emily",
      name: "Emily",
      partner: "Daniel",
      firstStep: videoPropsFixture.brief.topMoves[0],
      firstStepScore: { now: "52", after: "57" },
      waitGap: null,
    } as LiveReady;
    const page: LivePage = { chapters, cta: { type: "ask_trusted", text: "Send it." }, detail: [{ name: "A", label: "a", value: "$1" }] };

    // Act
    const card = firstStepOf(ready, page);

    // Assert
    expect(card).toMatchObject({ name: "Emily", partner: "Daniel", firstStepScore: { now: "52", after: "57" }, cta: page.cta, detail: page.detail });
    expect(card.chapters).toBe(chapters);
  });
});
