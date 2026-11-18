import type { FC } from 'react'
import { COLORS, FONT } from '../locked/tokens'

const SIZE = 360
const STROKE = 26
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
/** The gauge is a three-quarter ring, open at the bottom. */
const ARC_SHARE = 0.75
const ARC_START_DEGREES = 135
const SCORE_SCALE_MAX = 100

interface AltimeterProps {
  /** The score to show. Animate it by passing an interpolated value. */
  readonly value: number
  readonly caption: string
}

/** The score as altitude: a round gauge that fills as the family climbs. */
export const Altimeter: FC<AltimeterProps> = ({ value, caption }) => {
  const arcLength = CIRCUMFERENCE * ARC_SHARE
  const filled = arcLength * Math.min(1, Math.max(0, value / SCORE_SCALE_MAX))

  return (
    <div style={{ position: 'relative', width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2} fill={COLORS.card} />
        <g transform={`rotate(${ARC_START_DEGREES} ${SIZE / 2} ${SIZE / 2})`}>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS - STROKE}
            fill="none"
            stroke={COLORS.sunGlow}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${arcLength * ((RADIUS - STROKE) / RADIUS)} ${CIRCUMFERENCE}`}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS - STROKE}
            fill="none"
            stroke={COLORS.accent}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${filled * ((RADIUS - STROKE) / RADIUS)} ${CIRCUMFERENCE}`}
          />
        </g>
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: COLORS.ink,
          fontFamily: FONT.family,
        }}
      >
        <div style={{ fontSize: FONT.sizeFigure, fontWeight: FONT.weightBold, lineHeight: 1 }}>
          {Math.round(value)}
        </div>
        <div
          style={{
            fontSize: FONT.sizeSmall,
            fontWeight: FONT.weightRegular,
            color: COLORS.inkSoft,
            textTransform: 'capitalize',
          }}
        >
          {caption}
        </div>
      </div>
    </div>
  )
}
