import type { FC } from 'react'
import { AbsoluteFill, Easing, useCurrentFrame } from 'remotion'
import { Heading } from '../components/Heading'
import { Pop } from '../components/Pop'
import { StepCard } from '../components/StepCard'
import { bodyText } from '../components/ui'
import { COLORS, SCREEN_CONTENT } from '../locked/tokens'
import { spreadReveals } from './content'
import { tween, useSeconds } from './motion'
import type { SceneProps } from './types'

const CARDS_TOP = 250
const LINE_Y = 420
const GAP = 45
const AREA = { left: 60, width: 1380 } as const
/** The steps take their numbers, one by one, between these shares of the scene. */
const ORDER_SHARES = [0.3, 0.5] as const

/**
 * Part 4, your first step: the base video's "order matters". The plan's top moves appear as
 * cards, a dashed trail links them and they take their numbers; the first one is highlighted.
 */
export const FirstStepScene: FC<SceneProps> = ({ brief, chapter, durationInFrames }) => {
  const frame = useCurrentFrame()
  const seconds = useSeconds()
  const moves = brief.topMoves
  const width = (AREA.width - GAP * (moves.length - 1)) / moves.length
  const orderedAt = spreadReveals(moves.length, durationInFrames, ...ORDER_SHARES)
  const trail = tween(frame, orderedAt[0] - seconds(0.3), orderedAt.at(-1) ?? 0, 0, 1, Easing.inOut(Easing.quad))

  return (
    <AbsoluteFill>
      <Heading title={chapter.title} />
      {moves.length > 1 ? (
        <svg width={SCREEN_CONTENT.width} height={SCREEN_CONTENT.height} style={{ position: 'absolute' }}>
          <line
            x1={AREA.left + width / 2}
            y1={LINE_Y}
            x2={AREA.left + width / 2 + (AREA.width - width) * trail}
            y2={LINE_Y}
            stroke={COLORS.ink}
            strokeWidth={6}
            strokeDasharray="16 14"
            opacity={0.35}
          />
        </svg>
      ) : null}
      {moves.map((move, index) => (
        <StepCard
          key={move.title}
          move={move}
          order={index + 1}
          isFirst={index === 0}
          left={AREA.left + index * (width + GAP)}
          top={CARDS_TOP}
          width={width}
          delayFrames={seconds(0.3 + index * 0.25)}
          orderedAtFrame={orderedAt[index]}
        />
      ))}
      <Pop delayFrames={orderedAt.at(-1) ?? 0} from="up" style={{ left: 0, width: SCREEN_CONTENT.width, top: 740, textAlign: 'center' }}>
        <div style={{ ...bodyText, fontSize: 34, color: COLORS.ink }}>One step at a time, starting with the first.</div>
      </Pop>
    </AbsoluteFill>
  )
}
