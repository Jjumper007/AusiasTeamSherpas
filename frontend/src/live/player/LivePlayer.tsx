// The Live run's video: the template's locked composition (logo, office, presenter, camera, music,
// effects, narration, captions) in @remotion/player, with each part drawn from the scene registry.
// Keep `videoProps` the same object while it plays: a new one re-renders the whole composition.
import { useMemo, type CSSProperties, type Ref } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import type { Part, VideoProps } from "@sherpas/shared";
import { videoFrames } from "../../../../video-template/src/locked/timing";
import { VIDEO } from "../../../../video-template/src/locked/tokens";
import { Video } from "../../../../video-template/src/locked/Video";
import { SceneRegistryContext, type PageText, type SceneRegistry, type SceneRegistryValue } from "./scene-registry";

/**
 * Audio elements the Player creates up front and reuses. Music, one narration and the overlapping sound
 * effects (each plays for 3 s) stay well under this; more mounted at once would throw.
 */
const SHARED_AUDIO_TAGS = 12;
const PLAYER_STYLE: CSSProperties = { width: "100%", aspectRatio: `${VIDEO.width} / ${VIDEO.height}` };

export interface LivePlayerProps {
  readonly videoProps: VideoProps;
  readonly scenes: SceneRegistry;
  readonly onSceneError?: (part: Part, error: unknown) => void;
  /** The final chapters and CTA, once they arrive: the scenes draw them without a new `videoProps`. */
  readonly pageText?: PageText;
  readonly autoPlay?: boolean;
  readonly initiallyMuted?: boolean;
  /** Seek, play and read the clock (`getCurrentFrame`) through it. */
  readonly ref?: Ref<PlayerRef>;
  readonly className?: string;
}

export function LivePlayer({ videoProps, scenes, onSceneError, pageText, autoPlay = false, initiallyMuted = false, ref, className }: LivePlayerProps) {
  const durationInFrames = useMemo(() => videoFrames(videoProps.scenes, VIDEO.fps), [videoProps.scenes]);
  const registry = useMemo<SceneRegistryValue>(() => ({ scenes, onSceneError, pageText }), [scenes, onSceneError, pageText]);

  return (
    <SceneRegistryContext.Provider value={registry}>
      <Player
        ref={ref}
        component={Video}
        inputProps={videoProps}
        durationInFrames={durationInFrames}
        compositionWidth={VIDEO.width}
        compositionHeight={VIDEO.height}
        fps={VIDEO.fps}
        controls
        autoPlay={autoPlay}
        initiallyMuted={initiallyMuted}
        numberOfSharedAudioTags={SHARED_AUDIO_TAGS}
        acknowledgeRemotionLicense
        className={className}
        style={PLAYER_STYLE}
      />
    </SceneRegistryContext.Provider>
  );
}
