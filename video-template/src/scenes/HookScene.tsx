import { Send, Users } from 'lucide-react'
import type { FC } from 'react'
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion'
import { TOPIC_ICON } from '../components/icons'
import { Pop } from '../components/Pop'
import { bodyText, clampLines, ICON_STROKE, titleText } from '../components/ui'
import { COLORS, SCREEN_CONTENT } from '../locked/tokens'
import { companionsOf, joinNames, TOPIC_LABEL } from './content'
import { tween, useEntrance, useSeconds } from './motion'
import type { SceneProps } from './types'

/** The paper plane flies the route between these shares of the scene. */
const FLIGHT_SHARE = [0.2, 0.75] as const
/** A quadratic curve that stays below the text block and under the topic disc. */
const ROUTE = { start: [60, 840], control: [760, 560], end: [1440, 700] } as const
const DISC = { left: 1060, top: 150, size: 360 } as const

const along = (progress: number, a: number, b: number, c: number): number =>
  (1 - progress) * (1 - progress) * a + 2 * (1 - progress) * progress * b + progress * progress * c

/** Part 1, the hook: who the video is for, what is on their mind, and a plane crossing the route. */
export const HookScene: FC<SceneProps> = ({ brief, durationInFrames }) => {
  const frame = useCurrentFrame()
  const seconds = useSeconds()
  const disc = useEntrance(seconds(0.6), 11)
  const TopicIcon = TOPIC_ICON[brief.survey.topOfMind]
  const companions = companionsOf(brief)
  const flight = tween(
    frame,
    durationInFrames * FLIGHT_SHARE[0],
    durationInFrames * FLIGHT_SHARE[1],
    0,
    1,
    Easing.inOut(Easing.quad),
  )
  const planeX = along(flight, ROUTE.start[0], ROUTE.control[0], ROUTE.end[0])
  const planeY = along(flight, ROUTE.start[1], ROUTE.control[1], ROUTE.end[1])

  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: DISC.left,
          top: DISC.top,
          width: DISC.size,
          height: DISC.size,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${COLORS.blueLine}, ${COLORS.blueWash} 58%, rgba(239,245,255,0) 72%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          scale: String(interpolate(disc, [0, 1], [0.3, 1])),
          opacity: Math.min(1, disc),
        }}
      >
        <TopicIcon size={170} color={COLORS.brandBlue} strokeWidth={ICON_STROKE} />
      </div>
      <svg width={SCREEN_CONTENT.width} height={SCREEN_CONTENT.height} style={{ position: 'absolute' }}>
        <path
          d={`M ${ROUTE.start.join(' ')} Q ${ROUTE.control.join(' ')} ${ROUTE.end.join(' ')}`}
          fill="none"
          stroke={COLORS.brandBlue}
          strokeWidth={5}
          strokeDasharray="14 14"
          opacity={0.3}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: planeX - 34,
          top: planeY - 34,
          rotate: `${interpolate(flight, [0, 1], [-10, 30])}deg`,
          opacity: flight > 0 && flight < 1 ? 1 : 0,
        }}
      >
        <Send size={68} color={COLORS.brandBlue} strokeWidth={ICON_STROKE} />
      </div>

      <Pop delayFrames={seconds(0.9)} from="left" style={{ left: 80, top: 210, maxWidth: 950 }}>
        <div style={{ ...titleText, fontSize: 104, lineHeight: 1.05, ...clampLines(1) }}>Hi, {brief.survey.nickname}.</div>
      </Pop>
      <Pop delayFrames={seconds(1.5)} from="left" style={{ left: 80, top: 330, maxWidth: 950 }}>
        <div style={{ ...titleText, fontSize: 96, lineHeight: 1.05 }}>Here is your plan.</div>
      </Pop>
      <Pop delayFrames={seconds(2.2)} from="up" style={{ left: 80, top: 480, maxWidth: 950 }}>
        <div style={{ ...bodyText, fontSize: 38 }}>On your mind: {TOPIC_LABEL[brief.survey.topOfMind]}</div>
      </Pop>
      {companions.length > 0 ? (
        <Pop delayFrames={seconds(2.6)} from="up" style={{ left: 80, top: 545, maxWidth: 950 }}>
          <div style={{ ...bodyText, fontSize: 34, display: 'flex', alignItems: 'center', gap: 14 }}>
            <Users size={38} color={COLORS.brandBlue} strokeWidth={ICON_STROKE} />
            With {joinNames(companions)}
          </div>
        </Pop>
      ) : null}
    </AbsoluteFill>
  )
}
