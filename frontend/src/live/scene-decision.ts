// Which version of a part plays (#15, docs/specs/live-run.md, "Player and decision in the browser"): Claude's
// scene goes in only if its module is loaded and ready to mount at least SWAP_MARGIN_SEC before its part
// starts on the Player's clock; otherwise the part keeps its Standard scene. A decision is final.
//
// The Player's clock is the frame it shows now (`getCurrentFrame()`), whatever it is doing:
// - before playback starts the Player sits on frame 0, so a scene ready before the first frame goes in;
// - after a pause or a seek it is the frame the member left it on: a part whose first frame is at or behind
//   it has started, even if the member seeks back later. Each part is decided once and never again, so a
//   seek back or a replay never swaps a part that was already decided either way.
// Pure, so it is unit-tested; use-live-scenes.ts applies it.
import type { LiveSceneOutcome, LiveSceneReport } from "@sherpas/backend/src/api/live-types";
import type { Part } from "@sherpas/shared";
import type { PartWindow } from "./player/part-clock";

/** A scene must be ready this long before its part starts to be swapped in. */
export const SWAP_MARGIN_SEC = 2;

/** Why the Standard scene is kept: too close to the start, already started, already decided, or not a part of this video. */
export type KeepReason = "late" | "started" | "decided" | "unknown-part";

export type SceneDecision =
  | { readonly part: Part; readonly action: "swap"; readonly frame: number; readonly marginFrames: number }
  | { readonly part: Part; readonly action: "keep"; readonly reason: KeepReason; readonly frame: number; readonly marginFrames: number };

/** Parts already decided, swapped in or kept: never decided again. */
export type DecidedParts = ReadonlySet<Part>;
export const NOTHING_DECIDED: DecidedParts = new Set();

export interface DecideInput {
  readonly part: Part;
  /** Each part's frames on the Player's clock (`partWindows`). */
  readonly windows: readonly PartWindow[];
  /** The Player's frame when the scene's module is loaded and ready to mount. */
  readonly frame: number;
  readonly decided: DecidedParts;
  readonly fps: number;
}

/** The margin in frames: 2 s at 30 fps is 60 frames. */
export const swapMarginFrames = (fps: number): number => Math.round(SWAP_MARGIN_SEC * fps);

export const decideScene = ({ part, windows, frame, decided, fps }: DecideInput): SceneDecision => {
  const window = windows.find((each) => each.part === part);
  const marginFrames = window ? window.fromFrame - frame : 0;
  const keep = (reason: KeepReason): SceneDecision => ({ part, action: "keep", reason, frame, marginFrames });
  if (decided.has(part)) return keep("decided");
  if (!window) return keep("unknown-part");
  if (marginFrames <= 0) return keep("started");
  if (marginFrames < swapMarginFrames(fps)) return keep("late");
  return { part, action: "swap", frame, marginFrames };
};

/** The decided parts after a decision: the part is final from now on. */
export const withDecided = (decided: DecidedParts, part: Part): DecidedParts => new Set([...decided, part]);

const OUTCOME_OF: Readonly<Record<KeepReason | "swap", LiveSceneOutcome | undefined>> = {
  swap: "swapped",
  late: "late",
  started: "started",
  // Nothing new happened: no report.
  decided: undefined,
  "unknown-part": undefined,
};

/** The report the run's log gets for a decision; none for a repeat. */
export const reportOfDecision = (decision: SceneDecision, fps: number): LiveSceneReport | undefined => {
  const outcome = OUTCOME_OF[decision.action === "swap" ? "swap" : decision.reason];
  if (!outcome) return undefined;
  return { part: decision.part, outcome, videoSec: decision.frame / fps, marginSec: decision.marginFrames / fps, neededSec: SWAP_MARGIN_SEC };
};

/** The report of something that happened to a part outside the decision: its module failed to load, or the swapped-in scene threw. */
export const reportOfFailure = (
  part: Part,
  outcome: Extract<LiveSceneOutcome, "load-failed" | "threw">,
  windows: readonly PartWindow[],
  frame: number,
  fps: number,
  detail?: string,
): LiveSceneReport => {
  const fromFrame = windows.find((each) => each.part === part)?.fromFrame ?? frame;
  return { part, outcome, videoSec: frame / fps, marginSec: (fromFrame - frame) / fps, neededSec: SWAP_MARGIN_SEC, ...(detail ? { detail } : {}) };
};
