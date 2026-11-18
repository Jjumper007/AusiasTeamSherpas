import type { FC } from 'react'
import { interpolate } from 'remotion'
import { COLORS } from '../locked/tokens'
import { useEntrance } from '../scenes/motion'
import { clampLines, titleText } from './ui'

const UNDERLINE_PX = 120
const MAX_WIDTH = 1180

/** The screen title of the base video: it slides in and a brand-blue rule grows under it. No kicker. */
export const Heading: FC<{ readonly title: string }> = ({ title }) => {
  const progress = useEntrance(2, 16)
  return (
    <div
      style={{
        position: 'absolute',
        left: 70,
        top: 52,
        maxWidth: MAX_WIDTH,
        opacity: Math.min(1, progress),
        translate: `${interpolate(progress, [0, 1], [-60, 0])}px 0px`,
      }}
    >
      <div style={{ ...titleText, fontSize: 62, lineHeight: 1.1, ...clampLines(1) }}>{title}</div>
      <div
        style={{
          width: interpolate(progress, [0, 1], [0, UNDERLINE_PX]),
          height: 6,
          borderRadius: 3,
          background: COLORS.brandBlue,
          marginTop: 12,
        }}
      />
    </div>
  )
}
