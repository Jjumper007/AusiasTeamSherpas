import { Send, Users } from 'lucide-react'
import type { FC } from 'react'
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion'
import { TOPIC_ICON } from '../components/icons'
import { Pop } from '../components/Pop'
import { bodyText, ICON_STROKE, titleText } from '../components/ui'
import { COLORS, SCREEN_CONTENT } from '../locked/tokens'
import { companionsOf, joinNames, TOPIC_LABEL } from './content'
import { tween, useEntrance, useSeconds } from './motion'
import type { SceneProps } from './types'

/** The paper plane flies the route between these shares of the scene. */
const FLIGHT_SHARE = [0.2, 0.75] as const
/** A quadratic curve that stays below the text block and under the topic disc. */
const ROUTE = { start: [60, 840], control: [760, 560], end: [1440, 700] } as const
const DISC = { left: 1060, top: 150, size: 360 } as const

/** Each word starts rising this many frames after the one before. */
const WORD_STAGGER = 5
const WORD_RISE_FRAMES = 20

interface RisingWordsProps {
  readonly words: readonly string[]
  /** Index of the word in Sherpas Blue. */
  readonly accent: number
  readonly startFrame: number
  readonly top: number
  readonly fontSize: number
}

/** Video 4.0's opening line: each word rises, tilts upright and sharpens, one after another. */
const RisingWords: FC<RisingWordsProps> = ({ words, accent, startFrame, top, fontSize }) => {
  const frame = useCurrentFrame()
  return (
    <div style={{ position: 'absolute', left: 80, top, maxWidth: 950, display: 'flex', gap: fontSize * 0.25, whiteSpace: 'nowrap', overflow: 'hidden' }}>
      {words.map((word, index) => {
        const rise = tween(frame, startFrame + index * WORD_STAGGER, startFrame + index * WORD_STAGGER + WORD_RISE_FRAMES, 0, 1)
        return (
          <span
            key={index}
            style={{
              ...titleText,
              fontSize,
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
              color: index === accent ? COLORS.brandBlue : COLORS.ink,
              display: 'inline-block',
              opacity: rise,
              translate: `0px ${(1 - rise) * 70}px`,
              rotate: `${(1 - rise) * 5}deg`,
              filter: rise < 0.98 ? `blur(${(1 - rise) * 10}px)` : undefined,
            }}
          >
            {word}
          </span>
        )
      })}
    </div>
  )
}

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

      <RisingWords words={['Hi,', `${brief.survey.nickname}.`]} accent={1} startFrame={seconds(0.7)} top={200} fontSize={104} />
      <RisingWords words={['Here', 'is', 'your', 'plan.']} accent={3} startFrame={seconds(1.4)} top={330} fontSize={96} />
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
