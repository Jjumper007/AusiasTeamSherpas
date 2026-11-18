import type { HouseholdPerson } from '@sherpas/shared'
import type { FC } from 'react'
import { AbsoluteFill } from 'remotion'
import { COLORS, HIKER_COLORS, VIDEO } from '../locked/tokens'
import { pointAt } from './trail'

/** Distance along the trail between one hiker and the next, as a fraction of the trail. */
const HIKER_SPACING = 0.022
const ADULT_SCALE = 1
const CHILD_SCALE = 0.7
const BODY = { width: 30, height: 46, headRadius: 13, packWidth: 14, packHeight: 28 }

interface HikerProps {
  readonly x: number
  readonly y: number
  readonly scale: number
  readonly color: string
}

/** A flat, faceless silhouette standing with its feet on (x, y). */
const Hiker: FC<HikerProps> = ({ x, y, scale, color }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <rect
      x={-BODY.width / 2 - BODY.packWidth + 4}
      y={-BODY.height + 4}
      width={BODY.packWidth}
      height={BODY.packHeight}
      rx={5}
      fill={COLORS.sageDark}
    />
    <rect
      x={-BODY.width / 2}
      y={-BODY.height}
      width={BODY.width}
      height={BODY.height}
      rx={BODY.width / 2}
      fill={color}
    />
    <circle cx={0} cy={-BODY.height - BODY.headRadius + 2} r={BODY.headRadius} fill={color} />
  </g>
)

interface HikersProps {
  readonly household: readonly HouseholdPerson[]
  /** Position of the lead hiker along the trail (0 = trailhead, 1 = summit). */
  readonly fraction: number
  readonly scale?: number
}

/** The whole family on the trail, one silhouette per person, children drawn smaller. */
export const Hikers: FC<HikersProps> = ({ household, fraction, scale = 1 }) => (
  <AbsoluteFill>
    <svg viewBox={`0 0 ${VIDEO.width} ${VIDEO.height}`} width={VIDEO.width} height={VIDEO.height}>
      {household.map((person, index) => {
        const point = pointAt(fraction - index * HIKER_SPACING * scale)
        const personScale = person.role === 'child' ? CHILD_SCALE : ADULT_SCALE
        return (
          <Hiker
            key={person.firstName}
            x={point.x}
            y={point.y}
            scale={personScale * scale}
            color={HIKER_COLORS[index % HIKER_COLORS.length]}
          />
        )
      })}
    </svg>
  </AbsoluteFill>
)
