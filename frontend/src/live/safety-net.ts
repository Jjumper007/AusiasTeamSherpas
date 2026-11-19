// The Live run's safety net (docs/specs/live-run.md, user stories 17–18): if the video has not started
// 40 s after the survey was sent, or the run fails, the page plays the member's Demo video and says so;
// without a Demo video it says that clearly and offers "Try again". Pure: the page feeds it the facts.
import { LIVE_RUN_PLAYING } from "@sherpas/backend/src/api/live-types";

/** How long after sending the survey the page waits for `live-ready`. */
export const SAFETY_NET_MS = 40_000;

/** Whether the member has a Demo video: asked when the page opens; a failed lookup counts as "none". */
export type DemoVideoStatus = "unknown" | "found" | "none";

/** Why the net fired: the video took too long, or the run failed (a 409 and a lost connection included). */
export type NetReason = { readonly kind: "slow" } | { readonly kind: "failed"; readonly error: string };

export type NetView =
  | { readonly kind: "waiting" }
  /** `live-ready` arrived: the Live run's video plays and the net never fires again. */
  | { readonly kind: "live" }
  /** The net fired before the Demo video lookup answered (it is asked long before; almost never seen). */
  | { readonly kind: "checking"; readonly reason: NetReason }
  | { readonly kind: "demo"; readonly reason: NetReason }
  | { readonly kind: "no-demo"; readonly reason: NetReason };

export interface NetFacts {
  /** Milliseconds since the survey was sent. */
  readonly sinceSentMs: number;
  readonly ready: boolean;
  /** The run's first error message, if any. */
  readonly error: string | null;
  readonly demoVideo: DemoVideoStatus;
}

export const WAITING: NetView = { kind: "waiting" };

const fallback = (reason: NetReason, demoVideo: DemoVideoStatus): NetView => {
  if (demoVideo === "found") return { kind: "demo", reason };
  if (demoVideo === "none") return { kind: "no-demo", reason };
  return { kind: "checking", reason };
};

/** What the page shows next. Once it has switched (to the video, the Demo video or the message), it stays. */
export const decideNet = (previous: NetView, facts: NetFacts): NetView => {
  if (previous.kind === "live" || previous.kind === "demo" || previous.kind === "no-demo") return previous;
  if (previous.kind === "checking") return fallback(previous.reason, facts.demoVideo);
  if (facts.ready) return { kind: "live" };
  if (facts.error !== null) return fallback({ kind: "failed", error: facts.error }, facts.demoVideo);
  if (facts.sinceSentMs >= SAFETY_NET_MS) return fallback({ kind: "slow" }, facts.demoVideo);
  return WAITING;
};

/** The page shows the Demo video or the message (or is about to) instead of following the Live run. */
export const hasFired = (view: NetView): boolean => view.kind === "checking" || view.kind === "demo" || view.kind === "no-demo";

/** Milliseconds left before the net fires. */
export const msUntilNet = (sinceSentMs: number): number => Math.max(0, SAFETY_NET_MS - sinceSentMs);

export interface NetTexts {
  /** Shown above the Demo video for as long as it plays. */
  readonly notice: string;
  /** Why, in plain words: the Demo video was made with its own Demo answers, not the ones just sent. */
  readonly why: string;
  /** Secondary text: the run's error, or what to do. */
  readonly detail: string | null;
  /** Without a Demo video: the title and the line of the message in the stage. */
  readonly noDemoTitle: string;
  readonly noDemo: string;
}

const NOTICE = "Showing the video made earlier";
const MADE_EARLIER = "This one was made earlier from the same plan, with the answers given then.";
const RETRY_SOON = "Wait a few seconds, then try again.";

type Cause = "slow" | "failed" | "busy";

const causeOf = (reason: NetReason): Cause => {
  if (reason.kind === "slow") return "slow";
  return reason.error === LIVE_RUN_PLAYING ? "busy" : "failed";
};

const WHY: Record<Cause, string> = {
  slow: `The new video took more than ${SAFETY_NET_MS / 1000} seconds to start.`,
  failed: "The new video could not be made.",
  busy: "Another video was still being made, so a new one could not start.",
};

const NO_DEMO_TITLE: Record<Cause, string> = {
  slow: "The new video is taking too long",
  failed: "The video could not be made",
  busy: "Another video is still being made",
};

const detailOf = (reason: NetReason, cause: Cause): string | null => {
  if (cause === "busy") return RETRY_SOON;
  return reason.kind === "failed" ? reason.error : null;
};

/** The words of the notice and of the message, for `name` (the member the page is for). */
export const netTexts = (reason: NetReason, name: string): NetTexts => {
  const cause = causeOf(reason);
  return {
    notice: NOTICE,
    why: `${WHY[cause]} ${MADE_EARLIER}`,
    detail: detailOf(reason, cause),
    noDemoTitle: NO_DEMO_TITLE[cause],
    noDemo: `There is no video made earlier for ${name} to show instead.`,
  };
};
