import type { CSSProperties, FC, ReactNode } from 'react'
import { interpolate } from 'remotion'
import { useEntrance } from '../scenes/motion'

const OFFSET_PX = 60

interface PopProps {
  readonly delayFrames: number
  readonly from?: 'up' | 'left' | 'right' | 'scale'
  readonly style?: CSSProperties
  readonly children: ReactNode
}

/** The entrance of the base video: an absolutely placed block springs in from a side or grows. */
export const Pop: FC<PopProps> = ({ delayFrames, from = 'up', style, children }) => {
  const progress = useEntrance(delayFrames)
  const offset = interpolate(progress, [0, 1], [OFFSET_PX, 0])
  const translate =
    from === 'up' ? `0px ${offset}px` : from === 'left' ? `${-offset}px 0px` : from === 'right' ? `${offset}px 0px` : '0px 0px'
  return (
    <div
      style={{
        position: 'absolute',
        opacity: Math.min(1, progress * 1.4),
        translate,
        scale: from === 'scale' ? String(interpolate(progress, [0, 1], [0.5, 1])) : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
