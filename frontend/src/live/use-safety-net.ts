// The safety net's wiring around the pure decision (safety-net.ts): asks for the member's Demo video when
// the page opens, starts the 40 s timer when the survey is sent (the instant the first-frame report counts
// from), and once the net fires stops following the Live run: its stream closes, so the server stops the
// run after its grace and frees the slot, and nothing that still arrives can change the page.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { JobResult } from "../types";
import { getDemoVideo } from "./demo-video-api";
import { decideNet, hasFired, msUntilNet, WAITING, type DemoVideoStatus, type NetView } from "./safety-net";

/** What the Live run tells the net (use-live-run.ts). */
export interface RunWatcher {
  /** The survey was sent at `at` (`performance.now()`); `stop` closes that run's stream. */
  sent(at: number, stop: () => void): void;
  ready(): void;
  error(message: string): void;
}

export interface SafetyNet {
  readonly view: NetView;
  /** The net has fired: the page shows the Demo video or the message instead of the Live run. */
  readonly fired: boolean;
  /** The member's Demo video, once known. */
  readonly demo: JobResult | null;
  readonly watcher: RunWatcher;
  /** Back to waiting, for "Try again" and "Start over". */
  readonly reset: () => void;
}

interface DemoLookup {
  readonly status: DemoVideoStatus;
  readonly result: JobResult | null;
}

interface RunFacts {
  readonly sentAt: number;
  readonly ready: boolean;
  readonly error: string | null;
  readonly stop: () => void;
}

const NO_DEMO: DemoLookup = { status: "none", result: null };

/** Asked once per member, when the page opens: never in the way of the Live run's POST. */
const useDemoVideo = (caseId: string, member: string): DemoLookup => {
  const [lookup, setLookup] = useState<DemoLookup>({ status: "unknown", result: null });
  useEffect(() => {
    let alive = true;
    getDemoVideo(caseId, member)
      .then((result) => alive && setLookup(result ? { status: "found", result } : NO_DEMO))
      .catch((e: Error) => {
        // Without an answer the net cannot play a Demo video: it will show the message instead.
        console.warn(`[live] Demo video lookup failed: ${e.message}`);
        if (alive) setLookup(NO_DEMO);
      });
    return () => {
      alive = false;
    };
  }, [caseId, member]);
  return lookup;
};

interface NetTimer {
  /** Wakes `onTime` 40 s after `sentAt` (again later if the timer came back a little early). */
  readonly arm: (sentAt: number) => void;
  readonly clear: () => void;
}

const useNetTimer = (onTime: () => void): NetTimer => {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const clear = useCallback(() => clearTimeout(timer.current), []);
  const arm = useCallback(
    (sentAt: number) => {
      timer.current = setTimeout(() => {
        if (msUntilNet(performance.now() - sentAt) > 0) arm(sentAt);
        else onTime();
      }, msUntilNet(performance.now() - sentAt));
    },
    [onTime],
  );
  useEffect(() => clear, [clear]);
  return useMemo(() => ({ arm, clear }), [arm, clear]);
};

interface WatcherParts {
  readonly run: { current: RunFacts | null };
  readonly timer: NetTimer;
  readonly restart: () => void;
  readonly update: () => void;
}

/** Records what the Live run reports, then lets the decision look at it again. */
const watcherOf = ({ run, timer, restart, update }: WatcherParts): RunWatcher => ({
  sent: (at, stop) => {
    timer.clear();
    run.current = { sentAt: at, ready: false, error: null, stop };
    restart();
    timer.arm(at);
  },
  ready: () => {
    timer.clear();
    if (run.current) run.current = { ...run.current, ready: true };
    update();
  },
  error: (message) => {
    const facts = run.current;
    // After live-ready the video keeps playing: a later error only reaches the console.
    if (facts?.ready) console.warn(`[live] after the video started: ${message}`);
    if (facts && facts.error === null) run.current = { ...facts, error: message };
    update();
  },
});

export function useSafetyNet(caseId: string, member: string): SafetyNet {
  const lookup = useDemoVideo(caseId, member);
  const [view, setView] = useState<NetView>(WAITING);
  const run = useRef<RunFacts | null>(null);
  const demoStatus = useRef(lookup.status);

  const update = useCallback(() => {
    const facts = run.current;
    if (!facts) return;
    const sinceSentMs = performance.now() - facts.sentAt;
    setView((previous) => decideNet(previous, { sinceSentMs, ready: facts.ready, error: facts.error, demoVideo: demoStatus.current }));
  }, []);
  const timer = useNetTimer(update);
  const restart = useCallback(() => setView(WAITING), []);

  useEffect(() => {
    demoStatus.current = lookup.status;
    update();
  }, [lookup.status, update]);

  const fired = hasFired(view);
  useEffect(() => {
    if (!fired) return;
    timer.clear();
    run.current?.stop();
  }, [fired, timer]);

  const watcher = useMemo(() => watcherOf({ run, timer, restart, update }), [timer, restart, update]);
  const reset = useCallback(() => {
    timer.clear();
    run.current = null;
    restart();
  }, [timer, restart]);

  return { view, fired, demo: lookup.result, watcher, reset };
}
