import { Easing, interpolate } from 'remotion'

/** Eased 0 → 1 progress between two frames, clamped outside them. */
export const ease = (frame: number, fromFrame: number, toFrame: number): number =>
  interpolate(frame, [fromFrame, toFrame], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  })

export const lerp = (from: number, to: number, progress: number): number =>
  from + (to - from) * progress
