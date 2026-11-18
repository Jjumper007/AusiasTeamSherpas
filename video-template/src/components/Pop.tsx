import type { CSSProperties, FC, ReactNode } from 'react'
import { useCurrentFrame } from 'remotion'
import { tween } from '../scenes/motion'

/** Video 4.0's promo pace: entrances are fast, sharpen out of a blur and never overshoot. */
const ENTRANCE_FRAMES = 14
const OFFSET_PX = 60
const SIDE_FACTOR = 1.4
const BLUR_PX = 10
const SCALE_FROM = 0.86

interface PopProps {
  readonly delayFrames: number
  readonly from?: 'up' | 'left' | 'right' | 'scale'
  readonly style?: CSSProperties
  readonly children: ReactNode
}

/** The entrance of the base video: an absolutely placed block slides in from a side, or grows. */
export const Pop: FC<PopProps> = ({ delayFrames, from = 'up', style, children }) => {
  const frame = useCurrentFrame()
  const progress = tween(frame, delayFrames, delayFrames + ENTRANCE_FRAMES, 0, 1)
  const offset = (1 - progress) * OFFSET_PX
  const translate =
    from === 'up'
      ? `0px ${offset}px`
      : from === 'left'
        ? `${-offset * SIDE_FACTOR}px 0px`
        : from === 'right'
          ? `${offset * SIDE_FACTOR}px 0px`
          : '0px 0px'
  return (
    <div
      style={{
        position: 'absolute',
        opacity: Math.min(1, progress * 2),
        translate,
        scale: from === 'scale' ? String(SCALE_FROM + (1 - SCALE_FROM) * progress) : undefined,
        filter: progress < 0.97 ? `blur(${(1 - progress) * BLUR_PX}px)` : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
