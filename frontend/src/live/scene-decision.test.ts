import { describe, expect, it } from "vitest";
import { videoPropsFixture } from "@sherpas/shared";
import { partWindows } from "./player/part-clock";
import {
  decideScene,
  NOTHING_DECIDED,
  reportOfDecision,
  reportOfFailure,
  SWAP_MARGIN_SEC,
  swapMarginFrames,
  withDecided,
} from "./scene-decision";

const FPS = 30;
const windows = partWindows(videoPropsFixture, FPS);
const partStart = windows[2].fromFrame;
const MARGIN = swapMarginFrames(FPS);

const decide = (frame: number, decided = NOTHING_DECIDED) => decideScene({ part: "what_matters", windows, frame, decided, fps: FPS });

describe("decideScene", () => {
  it("swaps in a scene ready exactly 2 s before its part starts", () => {
    // Act
    const decision = decide(partStart - MARGIN);

    // Assert
    expect(MARGIN).toBe(SWAP_MARGIN_SEC * FPS);
    expect(decision).toEqual({ part: "what_matters", action: "swap", frame: partStart - MARGIN, marginFrames: MARGIN });
  });

  it("swaps in a scene that is ready before the video has started, on frame 0", () => {
    // Act
    const decision = decide(0);

    // Assert
    expect(decision.action).toBe("swap");
    expect(decision.marginFrames).toBe(partStart);
  });

  it("keeps the Standard scene when the scene is ready less than 2 s before its part", () => {
    // Act
    const decision = decide(partStart - MARGIN + 1);

    // Assert
    expect(decision).toMatchObject({ action: "keep", reason: "late", marginFrames: MARGIN - 1 });
  });

  it("keeps the Standard scene of a part that has started, from its first frame on", () => {
    // Act
    const atStart = decide(partStart);
    const later = decide(windows[4].fromFrame);

    // Assert
    expect(atStart).toMatchObject({ action: "keep", reason: "started", marginFrames: 0 });
    expect(later).toMatchObject({ action: "keep", reason: "started" });
  });

  it("never decides a part again, even with plenty of time after a seek back", () => {
    // Arrange
    const decided = withDecided(NOTHING_DECIDED, "what_matters");

    // Act
    const decision = decide(0, decided);

    // Assert
    expect(decision).toMatchObject({ action: "keep", reason: "decided" });
  });

  it("keeps the Standard scene for a part this video does not have", () => {
    // Act
    const decision = decideScene({ part: "what_matters", windows: windows.filter((window) => window.part !== "what_matters"), frame: 0, decided: NOTHING_DECIDED, fps: FPS });

    // Assert
    expect(decision).toMatchObject({ action: "keep", reason: "unknown-part" });
  });
});

describe("withDecided", () => {
  it("adds a part without changing the set it was given", () => {
    // Act
    const decided = withDecided(NOTHING_DECIDED, "first_step");

    // Assert
    expect([...decided]).toEqual(["first_step"]);
    expect(NOTHING_DECIDED.size).toBe(0);
  });
});

describe("reports for the run's log", () => {
  it("gives the moment on the video and the margin in seconds of a swap or a late scene", () => {
    // Act
    const swapped = reportOfDecision(decide(partStart - 3 * FPS), FPS);
    const late = reportOfDecision(decide(partStart - FPS), FPS);

    // Assert
    expect(swapped).toEqual({ part: "what_matters", outcome: "swapped", videoSec: (partStart - 3 * FPS) / FPS, marginSec: 3, neededSec: 2 });
    expect(late).toMatchObject({ outcome: "late", marginSec: 1 });
  });

  it("gives a negative margin for a part that had started, and nothing for a repeat", () => {
    // Act
    const started = reportOfDecision(decide(partStart + FPS), FPS);
    const repeat = reportOfDecision(decide(0, withDecided(NOTHING_DECIDED, "what_matters")), FPS);

    // Assert
    expect(started).toMatchObject({ outcome: "started", marginSec: -1 });
    expect(repeat).toBeUndefined();
  });

  it("reports a module that failed to load with the reason", () => {
    // Act
    const report = reportOfFailure("what_matters", "load-failed", windows, partStart - 4 * FPS, FPS, "Failed to fetch");

    // Assert
    expect(report).toEqual({ part: "what_matters", outcome: "load-failed", videoSec: (partStart - 4 * FPS) / FPS, marginSec: 4, neededSec: 2, detail: "Failed to fetch" });
  });
});
