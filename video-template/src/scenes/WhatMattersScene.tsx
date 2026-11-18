import type { ExplainLevel, Fact } from '@sherpas/shared'
import type { FC } from 'react'
import { AbsoluteFill } from 'remotion'
import { Backdrop } from '../components/Backdrop'
import { BigFact, FactTable } from '../components/FactRows'
import { Hikers } from '../components/Hikers'
import { BodyText, Panel } from '../components/Panel'
import { fractionForScore } from '../components/trail'
import type { SceneProps } from './types'

const STRAIGHT_MAX_FACTS = 3
const PANEL_WIDTH: Readonly<Record<ExplainLevel, number>> = { simple: 760, straight: 860, nerd: 940 }

interface FiguresProps {
  readonly level: ExplainLevel
  readonly facts: readonly Fact[]
}

/** The depth changes with the explain level: one headline figure, a short list, or the full table. */
const Figures: FC<FiguresProps> = ({ level, facts }) => {
  if (level === 'simple') return <BigFact fact={facts[0]} />
  if (level === 'straight') {
    return <FactTable facts={facts.slice(0, STRAIGHT_MAX_FACTS)} detailed={false} />
  }
  return <FactTable facts={facts} detailed />
}

/** Part 3: what matters most. The only figures shown are the facts the script says this scene uses. */
export const WhatMattersScene: FC<SceneProps> = ({ brief, facts, scene, chapter }) => {
  const level = brief.survey.explainLevel
  const sceneFacts = scene.factsUsed.filter((name) => name in facts).map((name) => facts[name])

  return (
    <AbsoluteFill>
      <Backdrop />
      <Hikers household={brief.household} fraction={fractionForScore(brief.score.value)} />
      <Panel title={chapter.title} width={PANEL_WIDTH[level]}>
        {sceneFacts.length > 0 ? (
          <Figures level={level} facts={sceneFacts} />
        ) : (
          <BodyText>{chapter.body}</BodyText>
        )}
      </Panel>
    </AbsoluteFill>
  )
}
