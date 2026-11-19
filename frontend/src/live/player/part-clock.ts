// Where each part plays on the Player's clock (frames of the whole video, opening included), from the
// template's own timing: what chapters seek to and what decides whether a Claude scene can still swap in.
import type { Part, VideoProps } from "@sherpas/shared";
import { BRAND, sceneFrameRanges } from "../../../../video-template/src/locked/timing";

export interface PartWindow {
  readonly part: Part;
  readonly fromFrame: number;
  /** First frame after the part. */
  readonly toFrame: number;
}

export const partWindows = (props: VideoProps, fps: number): PartWindow[] => {
  const ranges = sceneFrameRanges(props.scenes, fps);
  return props.script.scenes.map((scene, index) => {
    const fromFrame = BRAND.contentFromFrame + ranges[index].from;
    return { part: scene.part, fromFrame, toFrame: fromFrame + ranges[index].durationInFrames };
  });
};

/** The part on screen at `frame`, or undefined during the opening logo and after the last part. */
export const partAt = (windows: readonly PartWindow[], frame: number): Part | undefined =>
  windows.find((window) => frame >= window.fromFrame && frame < window.toFrame)?.part;
