// One Live run as the page holds it. The run's stream is opened by the wait (through its ProgressSource)
// but owned here, so it outlives the wait: `page` may arrive after the video has started. Nothing is kept
// in this browser: the MP4 the server may keep in the run folder is for the Demo, not for this page.
import { useCallback, useEffect, useRef, useState } from "react";
import type { LivePage, LiveReady, LiveSceneEvent } from "@sherpas/backend/src/api/live-types";
import type { VideoProps } from "@sherpas/shared";
import { VIDEO } from "../../../video-template/src/locked/tokens";
import type { ProgressSource } from "../components/Wait";
import type { Answers } from "../types";
import { reportFirstFrame, startLiveRun, type LiveSession } from "./live-api";
import { withAudioOn } from "./player/audio-urls";
import { partWindows, type PartWindow } from "./player/part-clock";
import type { RunWatcher } from "./use-safety-net";

const MS_PER_SEC = 1000;

export interface LiveVideo {
  readonly ready: LiveReady;
  /** What the Player plays, narration served from this page's origin. The same object while it plays. */
  readonly props: VideoProps;
  readonly windows: readonly PartWindow[];
  readonly jobId: string | undefined;
  /** `performance.now()` when the survey was sent, and when `live-ready` arrived. */
  readonly submittedAt: number;
  readonly readyAt: number;
}

const videoOf = (ready: LiveReady, jobId: string | undefined, submittedAt: number): LiveVideo => {
  const props = withAudioOn(ready.props, window.location.origin);
  return { ready, props, windows: partWindows(props, VIDEO.fps), jobId, submittedAt, readyAt: performance.now() };
};

export interface LiveRun {
  readonly video: LiveVideo | null;
  readonly page: LivePage | null;
  /** Claude's scenes for parts 3–5 as the run resolved them, in order (repeats after a reconnect included). */
  readonly scenes: readonly LiveSceneEvent[];
  /** The wait's source for these answers: sends the survey and follows the run until `live-ready`. */
  readonly sourceFor: (answers: Answers) => ProgressSource<LiveReady>;
  /** Forgets the run (and closes its stream), for "Start over". */
  readonly reset: () => void;
  readonly onFirstFrame: (at: number, afterTap: boolean) => void;
}

/** `net` (the safety net) gets the run's errors instead of the wait, and when it was sent and how to stop it. */
export const useLiveRun = (caseId: string, member: string, net: RunWatcher): LiveRun => {
  const session = useRef<LiveSession | null>(null);
  const [video, setVideo] = useState<LiveVideo | null>(null);
  const [page, setPage] = useState<LivePage | null>(null);
  const [scenes, setScenes] = useState<readonly LiveSceneEvent[]>([]);

  const reset = useCallback(() => {
    session.current?.close();
    session.current = null;
    setVideo(null);
    setPage(null);
    setScenes([]);
  }, []);
  useEffect(() => () => session.current?.close(), []);

  const sourceFor = useCallback(
    (answers: Answers): ProgressSource<LiveReady> =>
      (on) => {
        reset();
        const submittedAt = performance.now();
        let gotReady = false;
        const run: LiveSession = startLiveRun(caseId, member, answers, {
          progress: on.progress,
          error: net.error,
          page: setPage,
          scene: (event) => setScenes((events) => [...events, event]),
          ready: (ready) => {
            gotReady = true;
            net.ready();
            setVideo(videoOf(ready, run.jobId(), submittedAt));
            on.done(ready);
          },
        });
        session.current = run;
        net.sent(submittedAt, run.close);
        // The wait lets go once the video is ready; the stream stays open for `page`, the scenes and the
        // background MP4, until `done` or `end` closes it ("Start over" and leaving the page close it too).
        return () => {
          if (!gotReady) run.close();
        };
      },
    [caseId, member, reset, net],
  );

  const onFirstFrame = useCallback(
    (at: number, afterTap: boolean) => {
      if (!video?.jobId) return;
      const report = { browserSec: (at - video.submittedAt) / MS_PER_SEC, sinceReadySec: (at - video.readyAt) / MS_PER_SEC, afterTap };
      // Only the run's log needs it: a lost report must never disturb the video.
      reportFirstFrame(video.jobId, report).catch(() => undefined);
    },
    [video],
  );

  return { video, page, scenes, sourceFor, reset, onFirstFrame };
};
