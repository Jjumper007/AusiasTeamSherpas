import { fmt, type ExplainLevel, type Fact, type TopicId } from '@sherpas/shared'
import type { FC } from 'react'
import { AbsoluteFill } from 'remotion'
import { FactRow } from '../components/FactRow'
import { Heading } from '../components/Heading'
import { TOPIC_ICON } from '../components/icons'
import { Pop } from '../components/Pop'
import { StatCard } from '../components/StatCard'
import { bodyText, cardStyle, clampLines, ICON_STROKE } from '../components/ui'
import { COLORS } from '../locked/tokens'
import { spreadReveals } from './content'
import { useSeconds } from './motion'
import { sceneFacts } from './scene-facts'
import type { SceneProps } from './types'

const STRAIGHT_MAX = 3
const NERD_MAX = 5
const STRAIGHT_ACCENTS = [COLORS.brandBlue, COLORS.lavender, COLORS.blueBright] as const

interface FiguresProps {
  readonly facts: readonly Fact[]
  readonly topic: TopicId
  readonly durationInFrames: number
}

/** `simple`: one headline figure, rounded, beside the topic's icon. */
const OneFigure: FC<FiguresProps> = ({ facts, topic, durationInFrames }) => {
  const [delay] = spreadReveals(1, durationInFrames)
  const Icon = TOPIC_ICON[topic]
  return (
    <>
      <StatCard
        left={70}
        top={210}
        width={860}
        height={540}
        delayFrames={delay}
        accent={COLORS.brandBlue}
        figure={fmt.round(facts[0])}
        label={facts[0].label}
        figureSize={170}
        labelSize={36}
      />
      <Pop delayFrames={delay + 10} from="scale" style={{ left: 1010, top: 290, width: 400, height: 400 }}>
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: COLORS.blueWash,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={190} color={COLORS.brandBlue} strokeWidth={ICON_STROKE} />
        </div>
      </Pop>
    </>
  )
}

/** `straight`: up to three rounded figures, side by side. */
const ThreeFigures: FC<FiguresProps> = ({ facts, durationInFrames }) => {
  const shown = facts.slice(0, STRAIGHT_MAX)
  const delays = spreadReveals(shown.length, durationInFrames)
  return (
    <>
      {shown.map((fact, index) => (
        <StatCard
          key={fact.label}
          left={70 + index * 470}
          top={220}
          width={430}
          height={430}
          delayFrames={delays[index]}
          accent={STRAIGHT_ACCENTS[index]}
          figure={fmt.round(fact)}
          label={fact.label}
          figureSize={96}
          labelSize={28}
          labelLines={5}
        />
      ))}
    </>
  )
}

/** `nerd`: the full table, exact and rounded. */
const FigureTable: FC<FiguresProps> = ({ facts, durationInFrames }) => {
  const shown = facts.slice(0, NERD_MAX)
  const delays = spreadReveals(shown.length, durationInFrames)
  return (
    <>
      {shown.map((fact, index) => (
        <FactRow key={fact.label} fact={fact} top={200 + index * 124} height={108} delayFrames={delays[index]} />
      ))}
    </>
  )
}

const FIGURES: Readonly<Record<ExplainLevel, FC<FiguresProps>>> = {
  simple: OneFigure,
  straight: ThreeFigures,
  nerd: FigureTable,
}

/**
 * Part 3, what matters most. The depth follows the explain level; the only figures shown are
 * the facts the script declares for this scene. Without any, the chapter text is shown.
 */
export const WhatMattersScene: FC<SceneProps> = ({ brief, facts, scene, chapter, durationInFrames }) => {
  const seconds = useSeconds()
  const figures = sceneFacts(scene, facts)
  const Figures = FIGURES[brief.survey.explainLevel]

  return (
    <AbsoluteFill>
      <Heading title={chapter.title} />
      {figures.length > 0 ? (
        <Figures facts={figures} topic={brief.survey.topOfMind} durationInFrames={durationInFrames} />
      ) : (
        <Pop delayFrames={seconds(0.6)} from="up" style={{ left: 70, top: 210, width: 1360, ...cardStyle, padding: '40px 48px' }}>
          <div style={{ ...bodyText, color: COLORS.ink, fontSize: 40, lineHeight: 1.4, ...clampLines(6) }}>{chapter.body}</div>
        </Pop>
      )}
    </AbsoluteFill>
  )
}
