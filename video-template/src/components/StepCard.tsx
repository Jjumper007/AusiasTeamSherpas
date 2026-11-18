import type { TopMove } from '@sherpas/shared'
import type { FC } from 'react'
import { useCurrentFrame } from 'remotion'
import { COLORS, RADIUS } from '../locked/tokens'
import { Pop } from './Pop'
import { bodyText, cardStyle, clampLines, titleText } from './ui'

const EFFORT_LABEL: Readonly<Record<TopMove['effort'], string>> = {
  low: 'Low effort',
  medium: 'Medium effort',
  high: 'High effort',
}

/** The number badge pulses this many frames when the step takes its place. */
const PULSE_FRAMES = 10

interface StepCardProps {
  readonly move: TopMove
  /** Position in the plan's order, starting at 1. */
  readonly order: number
  /** The first step gets the full action and the brand-blue border; the others only their title. */
  readonly isFirst: boolean
  readonly left: number
  readonly top: number
  readonly width: number
  readonly delayFrames: number
  /** Until this frame the badge shows "?"; then the step takes its number in the order. */
  readonly orderedAtFrame: number
}

/** A step of the plan, as in the base video's "order matters" scene. */
export const StepCard: FC<StepCardProps> = ({ move, order, isFirst, left, top, width, delayFrames, orderedAtFrame }) => {
  const frame = useCurrentFrame()
  const ordered = frame >= orderedAtFrame
  const pulse = ordered ? 1 + 0.25 * Math.max(0, 1 - (frame - orderedAtFrame) / PULSE_FRAMES) : 1
  const accent = isFirst ? COLORS.brandBlue : COLORS.blueLine

  return (
    <Pop
      delayFrames={delayFrames}
      from="up"
      style={{
        left,
        top,
        width,
        ...cardStyle,
        borderTop: `10px solid ${accent}`,
        outline: isFirst ? `4px solid ${COLORS.brandBlue}` : undefined,
        padding: '26px 30px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <div
          style={{
            width: 66,
            height: 66,
            borderRadius: RADIUS.pill,
            background: accent,
            color: isFirst ? COLORS.white : COLORS.brandBlue,
            ...titleText,
            fontSize: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            scale: String(pulse),
          }}
        >
          {ordered ? order : '?'}
        </div>
        <div
          style={{
            ...bodyText,
            fontSize: 24,
            padding: '6px 14px',
            borderRadius: RADIUS.tag,
            background: isFirst ? COLORS.blueWash : COLORS.frame,
            color: isFirst ? COLORS.brandBlue : COLORS.inkSecondary,
          }}
        >
          {isFirst ? 'Start here' : EFFORT_LABEL[move.effort]}
        </div>
      </div>
      <div style={{ ...titleText, fontSize: isFirst ? 42 : 34, marginTop: 16, lineHeight: 1.15, ...clampLines(2) }}>
        {move.title}
      </div>
      {isFirst ? (
        <>
          <div style={{ ...bodyText, fontSize: 28, marginTop: 10, ...clampLines(3) }}>{move.action}</div>
          <div style={{ ...bodyText, fontSize: 24, marginTop: 14, color: COLORS.brandBlue }}>{EFFORT_LABEL[move.effort]}</div>
        </>
      ) : null}
    </Pop>
  )
}
