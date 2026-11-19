// Claude's scenes in the Live run's Player (#15). For each `scene ready` event the module is loaded at once;
// once it is ready to mount, scene-decision.ts says, from the Player's current frame, whether it goes in. A
// swap changes only that part's entry of the scene registry: the Player is never remounted and `videoProps`
// never replaced. Every decision is reported to the run's log. `scene standard` events need nothing here: the
// part already plays its Standard scene. Events are taken once the video exists (they come after
// `live-ready` in practice: a scene starts with its voice and takes Claude seconds).
import { useEffect, useRef, type Dispatch, type RefObject, type SetStateAction } from "react";
import type { PlayerRef } from "@remotion/player";
import type { LiveSceneEvent, LiveSceneReport } from "@sherpas/backend/src/api/live-types";
import type { Part } from "@sherpas/shared";
import { VIDEO } from "../../../video-template/src/locked/tokens";
import { reportScene } from "./live-api";
import { loadSceneModule } from "./player/scene-host";
import { withScene, type SceneRegistry } from "./player/scene-registry";
import { decideScene, NOTHING_DECIDED, reportOfDecision, reportOfFailure, withDecided, type DecidedParts } from "./scene-decision";
import type { LiveVideo } from "./use-live-run";

type ReadyScene = Extract<LiveSceneEvent, { readonly status: "ready" }>;

export interface LiveScenesInput {
  readonly player: RefObject<PlayerRef | null>;
  readonly video: LiveVideo | null;
  /** The run's `scene` events so far. */
  readonly events: readonly LiveSceneEvent[];
  /** The registry the Player draws from, and how to change it. */
  readonly scenes: SceneRegistry;
  readonly setScenes: Dispatch<SetStateAction<SceneRegistry>>;
}

/** What this page did for the video playing now. Replaced (never changed in place) at each step. */
interface Tracking {
  readonly video: LiveVideo | null;
  /** Parts whose `ready` event was taken: loading or decided. A reconnect's repeats are ignored. */
  readonly taken: ReadonlySet<Part>;
  readonly decided: DecidedParts;
  /** Parts swapped in, with their registry id: a different id later means the boundary put the Standard scene back. */
  readonly swapped: ReadonlyMap<Part, string>;
}

const fresh = (video: LiveVideo | null): Tracking => ({ video, taken: new Set(), decided: NOTHING_DECIDED, swapped: new Map() });

const errorText = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** Only the run's log needs it: a lost report must never disturb the video. */
const send = (video: LiveVideo, report: LiveSceneReport): void => {
  if (video.jobId) reportScene(video.jobId, report).catch(() => undefined);
};

export const useLiveScenes = ({ player, video, events, scenes, setScenes }: LiveScenesInput): void => {
  const tracking = useRef<Tracking>(fresh(null));
  const frameNow = () => player.current?.getCurrentFrame() ?? 0;

  /** Loads one scene's module, then decides on the Player's clock at that moment. */
  const take = async (event: ReadyScene, forVideo: LiveVideo): Promise<void> => {
    const loaded = await loadSceneModule(event.moduleUrl).then(
      (component) => ({ component }),
      (error: unknown) => ({ error }),
    );
    if (tracking.current.video !== forVideo) return;
    const { part } = event;
    const frame = frameNow();
    const decided = withDecided(tracking.current.decided, part);
    if ("error" in loaded) {
      tracking.current = { ...tracking.current, decided };
      send(forVideo, reportOfFailure(part, "load-failed", forVideo.windows, frame, VIDEO.fps, errorText(loaded.error)));
      return;
    }
    const decision = decideScene({ part, windows: forVideo.windows, frame, decided: tracking.current.decided, fps: VIDEO.fps });
    const swap = decision.action === "swap";
    const swapped = swap ? new Map([...tracking.current.swapped, [part, event.moduleUrl]]) : tracking.current.swapped;
    tracking.current = { ...tracking.current, decided, swapped };
    if (swap) setScenes((registry) => withScene(registry, part, { component: loaded.component, source: "claude", id: event.moduleUrl }));
    const report = reportOfDecision(decision, VIDEO.fps);
    if (report) send(forVideo, report);
  };

  useEffect(() => {
    // No video (start over): forget the old one at once, so a module still loading for it is dropped.
    if (!video) {
      tracking.current = fresh(null);
      return;
    }
    if (tracking.current.video !== video) tracking.current = fresh(video);
    const ready = events.filter((event): event is ReadyScene => event.status === "ready" && !tracking.current.taken.has(event.part));
    ready.forEach((event) => {
      tracking.current = { ...tracking.current, taken: new Set([...tracking.current.taken, event.part]) };
      void take(event, video);
    });
    // `take` reads the Player and the tracking through refs; only new events or a new video matter here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video, events]);

  // A swapped-in scene that throws is put back on its Standard scene by the registry's owner (LiveApp's
  // onSceneError): the part's entry changes under us. That is reported once.
  useEffect(() => {
    const current = tracking.current;
    if (!video || current.video !== video) return;
    const putBack = [...current.swapped].filter(([part, id]) => scenes[part].id !== id).map(([part]) => part);
    if (putBack.length === 0) return;
    tracking.current = { ...current, swapped: new Map([...current.swapped].filter(([part]) => !putBack.includes(part))) };
    putBack.forEach((part) => send(video, reportOfFailure(part, "threw", video.windows, frameNow(), VIDEO.fps)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenes, video]);
};
