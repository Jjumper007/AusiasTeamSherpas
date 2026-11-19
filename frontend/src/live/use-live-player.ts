// Starting the Live run's video and following its clock. Measured in Chrome (#13): with `autoPlay`, the
// composition's first paint takes 1.1–1.8 s and the Player's time-based clock skips the opening logo's
// first second. So the Player is mounted paused (under the wait while the yak runs off), we wait until it
// has really painted frame 0, and only then call play(). Without a user activation in this document
// (e.g. after a reload) the browser would play it muted: the page asks for a tap instead.
import { useCallback, useEffect, useRef, useState, type RefObject, type SyntheticEvent } from "react";
import type { PlayerRef } from "@remotion/player";
import { chapterAt } from "./live-page";
import type { PartWindow } from "./player/part-clock";

/** Animation frames after the Player has a size: frame 0 has then been committed and painted. */
const PAINTED_AFTER_FRAMES = 2;

type FrameListener = (event: { detail: { frame: number } }) => void;

/** True once the mounted Player has painted its first frame. */
const usePainted = (player: RefObject<PlayerRef | null>, mounted: boolean): boolean => {
  const [painted, setPainted] = useState(false);
  useEffect(() => {
    setPainted(false);
    if (!mounted) return;
    let sized = 0;
    let id = 0;
    const check = () => {
      if ((player.current?.getScale() ?? 0) > 0) sized += 1;
      if (sized >= PAINTED_AFTER_FRAMES) {
        setPainted(true);
        return;
      }
      id = requestAnimationFrame(check);
    };
    id = requestAnimationFrame(check);
    return () => cancelAnimationFrame(id);
  }, [player, mounted]);
  return painted;
};

/** The browser plays with sound only after the person has interacted with this document. */
export const hasActivation = (): boolean => navigator.userActivation?.hasBeenActive ?? true;

export interface LiveStartInput {
  readonly player: RefObject<PlayerRef | null>;
  /** The Player is mounted: `live-ready` arrived. */
  readonly mounted: boolean;
  /** The wait has let go of the stage: the video may start. */
  readonly canStart: boolean;
  /** Once, when the clock first moves after play: `performance.now()` then, and whether it took a tap. */
  readonly onFirstFrame: (at: number, afterTap: boolean) => void;
}

export interface LiveStart {
  readonly started: boolean;
  /** The page has no user activation: show a start control rather than playing muted. */
  readonly needsTap: boolean;
  readonly tap: (e: SyntheticEvent) => void;
  /** Jumps to a frame and plays (a chapter click); starts the video if it had not started. */
  readonly seek: (frame: number, e?: SyntheticEvent) => void;
}

/** Calls `onFirst` once, when the Player shows a frame other than the one it starts from; returns how to stop watching. */
const watchFirstFrame = (instance: PlayerRef, onFirst: () => void): (() => void) => {
  const fromFrame = instance.getCurrentFrame();
  const stop = () => instance.removeEventListener("frameupdate", onFrame);
  const onFrame: FrameListener = ({ detail }) => {
    if (detail.frame === fromFrame) return;
    stop();
    onFirst();
  };
  instance.addEventListener("frameupdate", onFrame);
  return stop;
};

export const useLiveStart = ({ player, mounted, canStart, onFirstFrame }: LiveStartInput): LiveStart => {
  const painted = usePainted(player, mounted);
  const [started, setStarted] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const stopWatching = useRef<() => void>(() => undefined);
  const firstFrame = useRef(onFirstFrame);
  useEffect(() => {
    firstFrame.current = onFirstFrame;
  }, [onFirstFrame]);

  const begin = useCallback(
    (afterTap: boolean, e?: SyntheticEvent) => {
      const instance = player.current;
      if (!instance) return;
      stopWatching.current = watchFirstFrame(instance, () => firstFrame.current(performance.now(), afterTap));
      setStarted(true);
      setNeedsTap(false);
      instance.play(e);
    },
    [player],
  );

  useEffect(() => {
    if (!mounted) setStarted(false);
  }, [mounted]);
  useEffect(() => () => stopWatching.current(), []);

  useEffect(() => {
    if (!painted || !canStart || started) return;
    if (!hasActivation()) {
      setNeedsTap(true);
      return;
    }
    begin(false);
  }, [painted, canStart, started, begin]);

  const tap = useCallback((e: SyntheticEvent) => begin(true, e), [begin]);
  const seek = useCallback(
    (frame: number, e?: SyntheticEvent) => {
      const instance = player.current;
      if (!instance) return;
      instance.seekTo(frame);
      if (!started) begin(needsTap, e);
      else instance.play(e);
    },
    [player, started, needsTap, begin],
  );

  return { started, needsTap, tap, seek };
};

/** The chapter playing now, from the Player's own clock; it changes state only when the chapter does. */
export const useActiveChapter = (player: RefObject<PlayerRef | null>, windows: readonly PartWindow[] | undefined): number => {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const instance = player.current;
    if (!instance || !windows) return;
    const update: FrameListener = ({ detail }) => setActive(chapterAt(windows, detail.frame));
    instance.addEventListener("frameupdate", update);
    instance.addEventListener("seeked", update);
    return () => {
      instance.removeEventListener("frameupdate", update);
      instance.removeEventListener("seeked", update);
    };
  }, [player, windows]);
  return active;
};
