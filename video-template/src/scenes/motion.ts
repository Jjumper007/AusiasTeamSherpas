import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'

/** Animation helpers of the base video, shared by every scene on the screen. */

export const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

/** The system's ease-out (DESIGN.md: cubic-bezier(0.16, 1, 0.3, 1)). */
export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1)

/**
 * A value moving from `from` to `to` between two frames, clamped outside them. A span of zero
 * frames (or less) jumps straight to `to`: `interpolate` would throw on it, and scene timings
 * come from the narration, so very short scenes must not break the render.
 */
export const tween = (
  frame: number,
  startFrame: number,
  endFrame: number,
  from: number,
  to: number,
  easing: (t: number) => number = EASE_OUT,
): number =>
  endFrame <= startFrame
    ? frame >= startFrame
      ? to
      : from
    : interpolate(frame, [startFrame, endFrame], [from, to], { ...CLAMP, easing })

/** A spring from 0 to 1 that starts at `delayFrames`: the entrance of every card and line. */
export const useEntrance = (delayFrames: number, damping = 14): number => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  return spring({ frame: frame - delayFrames, fps, config: { damping, stiffness: 150 } })
}

/** Converts seconds to frames at the composition's frame rate. */
export const useSeconds = (): ((seconds: number) => number) => {
  const { fps } = useVideoConfig()
  return (seconds) => Math.round(seconds * fps)
}
