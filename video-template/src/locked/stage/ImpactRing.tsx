import type { FC } from 'react'
import { useCurrentFrame } from 'remotion'
import { COLORS } from '../tokens'

/**
 * LOCKED. Video 4.0's impact accent: an expanding ring with thin radial ticks that fades out.
 * The stage uses it under good-news stamps; scenes may use it too.
 */

const RING_FRAMES = 26

interface ImpactRingProps {
  readonly startFrame: number
  /** Centre, in the coordinates of the parent. */
  readonly x: number
  readonly y: number
  readonly colors?: readonly string[]
  readonly count?: number
  /** How far the ring travels, in px. */
  readonly power?: number
}

export const ImpactRing: FC<ImpactRingProps> = ({
  startFrame,
  x,
  y,
  colors = [COLORS.blueBright, COLORS.lavender, COLORS.sky],
  count = 14,
  power = 200,
}) => {
  const frame = useCurrentFrame()
  const t = (frame - startFrame) / RING_FRAMES
  if (t < 0 || t > 1) return null
  const radius = power * 0.55 * (1 - Math.pow(1 - t, 4))
  return (
    <svg width={2} height={2} style={{ position: 'absolute', left: x, top: y, overflow: 'visible' }}>
      <circle cx={0} cy={0} r={radius} fill="none" stroke={colors[0]} strokeWidth={4 * (1 - t)} opacity={1 - t} />
      {Array.from({ length: count }, (_, index) => {
        const angle = (index / count) * Math.PI * 2 + 0.2
        const inner = radius * 0.9
        const outer = radius * (0.9 + 0.45 * (1 - t))
        return (
          <line
            key={index}
            x1={Math.cos(angle) * inner}
            y1={Math.sin(angle) * inner}
            x2={Math.cos(angle) * outer}
            y2={Math.sin(angle) * outer}
            stroke={colors[index % colors.length]}
            strokeWidth={3}
            strokeLinecap="round"
            opacity={1 - t}
          />
        )
      })}
    </svg>
  )
}
