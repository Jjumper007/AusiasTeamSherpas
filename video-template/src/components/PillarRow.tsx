import type { FC } from 'react'
import { useCurrentFrame } from 'remotion'
import { COLORS, RADIUS } from '../locked/tokens'
import { pillarTone, type PillarTone } from '../scenes/content'
import { tween } from '../scenes/motion'
import type { PillarScore } from '../scenes/scene-facts'
import { pillarIcon } from './icons'
import { Pop } from './Pop'
import { bodyText, cardStyle, clampLines, ICON_STROKE, titleText } from './ui'

const TONE_COLOR: Readonly<Record<PillarTone, string>> = {
  strong: COLORS.success,
  middle: COLORS.warning,
  weak: COLORS.error,
}

const BAR_WIDTH = 300
const BAR_GROW_FRAMES = 24

interface PillarRowProps {
  readonly name: string
  /** The area's points, when the scene declares them; without it only the name is shown. */
  readonly score?: PillarScore
  readonly left: number
  readonly top: number
  readonly width: number
  readonly delayFrames: number
}

/** One area of the score: its icon and name, and, if declared, a bar with "points of maximum". */
export const PillarRow: FC<PillarRowProps> = ({ name, score, left, top, width, delayFrames }) => {
  const frame = useCurrentFrame()
  const Icon = pillarIcon(name)
  const share = score && score.maxPoints.value > 0 ? score.points.value / score.maxPoints.value : 0
  const grow = tween(frame, delayFrames + 6, delayFrames + 6 + BAR_GROW_FRAMES, 0, 1)
  const color = score ? TONE_COLOR[pillarTone(score.points.value, score.maxPoints.value)] : COLORS.hairline

  return (
    <Pop
      delayFrames={delayFrames}
      from="right"
      style={{
        left,
        top,
        width,
        height: 100,
        ...cardStyle,
        border: `${score ? 3 : 1}px solid ${score ? color : COLORS.hairline}`,
        display: 'flex',
        alignItems: 'center',
        gap: 22,
        padding: '0 26px',
        opacity: score ? undefined : 0.85,
      }}
    >
      <div
        style={{
          width: 60,
          height: 60,
          flexShrink: 0,
          borderRadius: RADIUS.control,
          background: COLORS.blueWash,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={34} color={COLORS.brandBlue} strokeWidth={ICON_STROKE} />
      </div>
      <div style={{ ...titleText, fontSize: 30, flex: 1, ...clampLines(2) }}>{name}</div>
      {score ? (
        <>
          <div style={{ width: BAR_WIDTH, height: 22, borderRadius: RADIUS.pill, background: COLORS.hairline, overflow: 'hidden' }}>
            <div style={{ width: BAR_WIDTH * share * grow, height: '100%', borderRadius: RADIUS.pill, background: color }} />
          </div>
          <div style={{ ...bodyText, color: COLORS.ink, fontSize: 28, whiteSpace: 'nowrap', minWidth: 110, textAlign: 'right' }}>
            {score.points.value} of {score.maxPoints.value}
          </div>
        </>
      ) : null}
    </Pop>
  )
}
