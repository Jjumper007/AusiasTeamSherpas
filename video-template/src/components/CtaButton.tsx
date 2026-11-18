import type { LucideIcon } from 'lucide-react'
import type { FC } from 'react'
import { Easing, interpolate, useCurrentFrame } from 'remotion'
import { COLORS, CTA_GRADIENT, RADIUS } from '../locked/tokens'
import { CLAMP, tween, useEntrance } from '../scenes/motion'
import { ICON_STROKE, titleText } from './ui'

const BUTTON = { width: 680, height: 140 } as const
const PRESS_FRAMES = 6
const RIPPLE_FRAMES = 20
const CURSOR_START = { x: 1460, y: 860 } as const

interface CtaButtonProps {
  readonly label: string
  readonly icon: LucideIcon
  readonly left: number
  readonly top: number
  readonly appearAtFrame: number
  /** The cursor arrives and clicks at this frame. */
  readonly clickAtFrame: number
}

/** The closing call to action of the base video: the primary pill, a cursor that clicks it and a ripple. */
export const CtaButton: FC<CtaButtonProps> = ({ label, icon: Icon, left, top, appearAtFrame, clickAtFrame }) => {
  const frame = useCurrentFrame()
  const appear = useEntrance(appearAtFrame, 11)
  const cursorStart = Math.max(appearAtFrame, clickAtFrame - 36)
  const cursor = tween(frame, cursorStart, clickAtFrame, 0, 1, Easing.inOut(Easing.cubic))
  const pressed = frame >= clickAtFrame && frame < clickAtFrame + PRESS_FRAMES
  const ripple = interpolate(frame, [clickAtFrame, clickAtFrame + RIPPLE_FRAMES], [0, 1], CLAMP)
  const pulse = 1 + Math.max(0, Math.sin((frame - appearAtFrame) / 8)) * 0.03

  return (
    <>
      <div
        style={{
          position: 'absolute',
          left,
          top,
          width: BUTTON.width,
          height: BUTTON.height,
          opacity: Math.min(1, appear),
          scale: String(interpolate(appear, [0, 1], [0.4, 1]) * pulse * (pressed ? 0.94 : 1)),
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: -24 * ripple,
            borderRadius: RADIUS.pill,
            border: `6px solid ${COLORS.brandBlue}`,
            opacity: frame >= clickAtFrame ? 1 - ripple : 0,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: RADIUS.pill,
            background: CTA_GRADIENT,
            boxShadow: `inset 0 2px 4px 0 #B8C1E6, 0 18px 40px rgba(69, 101, 214, 0.40)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
            color: COLORS.white,
          }}
        >
          <Icon size={52} strokeWidth={ICON_STROKE} />
          <span style={{ ...titleText, color: COLORS.white, fontSize: 50, whiteSpace: 'nowrap' }}>{label}</span>
        </div>
      </div>
      <svg
        width={70}
        height={80}
        viewBox="0 0 70 80"
        style={{
          position: 'absolute',
          left: interpolate(cursor, [0, 1], [CURSOR_START.x, left + BUTTON.width * 0.65]),
          top: interpolate(cursor, [0, 1], [CURSOR_START.y, top + BUTTON.height * 0.6]),
          opacity: frame >= cursorStart ? 1 : 0,
          scale: pressed ? '0.9' : '1',
        }}
      >
        <path d="M6 4 L6 62 L22 48 L34 74 L46 68 L34 42 L56 42 Z" fill={COLORS.white} stroke={COLORS.ink} strokeWidth={5} strokeLinejoin="round" />
      </svg>
    </>
  )
}
