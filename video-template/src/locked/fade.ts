/**
 * LOCKED. Opacity (0–1) of something shown from `startFrame` to `endFrame` that fades in and out
 * over `fadeFrames` at each end. Short spans get shorter fades, so it never needs the strictly
 * increasing input range that Remotion's `interpolate` requires (a caption cue can be one word).
 */
export const fadeInOut = (frame: number, startFrame: number, endFrame: number, fadeFrames: number): number => {
  if (frame < startFrame || frame > endFrame) return 0
  const fade = Math.min(fadeFrames, (endFrame - startFrame) / 2)
  if (fade <= 0) return 1
  return Math.max(0, Math.min(1, (frame - startFrame) / fade, (endFrame - frame) / fade))
}
