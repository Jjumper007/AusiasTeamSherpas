import type { FC, ReactNode } from 'react'
import { interpolate, useCurrentFrame } from 'remotion'
import { COLORS, FONT, SAFE_MARGIN } from '../locked/tokens'

const FADE_IN_FRAMES = 15
const RISE_PIXELS = 24
const DEFAULT_WIDTH = 760
const GAP = 28

interface PanelProps {
  readonly title: string
  readonly width?: number
  readonly children?: ReactNode
}

/** The text area of a scene: chapter title plus content, in the open sky at the top left. */
export const Panel: FC<PanelProps> = ({ title, width = DEFAULT_WIDTH, children }) => {
  const frame = useCurrentFrame()
  const appear = interpolate(frame, [0, FADE_IN_FRAMES], [0, 1], { extrapolateRight: 'clamp' })

  return (
    <div
      style={{
        position: 'absolute',
        left: SAFE_MARGIN,
        top: SAFE_MARGIN,
        width,
        display: 'flex',
        flexDirection: 'column',
        gap: GAP,
        opacity: appear,
        transform: `translateY(${(1 - appear) * RISE_PIXELS}px)`,
        color: COLORS.ink,
        fontFamily: FONT.family,
      }}
    >
      <div style={{ fontSize: FONT.sizeTitle, fontWeight: FONT.weightBold, lineHeight: 1.1 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

/** A paragraph of body text inside a panel. */
export const BodyText: FC<{ readonly children: ReactNode }> = ({ children }) => (
  <div
    style={{
      fontSize: FONT.sizeBody,
      fontWeight: FONT.weightRegular,
      lineHeight: 1.3,
      color: COLORS.inkSoft,
    }}
  >
    {children}
  </div>
)
