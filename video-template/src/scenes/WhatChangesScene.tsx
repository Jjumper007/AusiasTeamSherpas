import type { FC } from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { Altimeter } from '../components/Altimeter'
import { Backdrop } from '../components/Backdrop'
import { Hikers } from '../components/Hikers'
import { BodyText, Panel } from '../components/Panel'
import { fractionForScore } from '../components/trail'
import { ease, lerp } from './motion'
import type { SceneProps } from './types'

const CLIMB_START_FRAME = 15
const CLIMB_SHARE = 0.6

/** Part 5: what changes if you take the step. The family climbs one stretch: score before → score after. */
export const WhatChangesScene: FC<SceneProps> = ({ brief, chapter, durationInFrames }) => {
  const frame = useCurrentFrame()
  const [firstMove] = brief.topMoves
  const climb = ease(frame, CLIMB_START_FRAME, durationInFrames * CLIMB_SHARE)
  const score = lerp(firstMove.scoreBefore, firstMove.scoreAfter, climb)

  return (
    <AbsoluteFill>
      <Backdrop />
      <Hikers household={brief.household} fraction={fractionForScore(score)} />
      <Panel title={chapter.title}>
        <Altimeter value={score} caption={firstMove.title} />
        <BodyText>
          {firstMove.scoreBefore} → {firstMove.scoreAfter}
        </BodyText>
      </Panel>
    </AbsoluteFill>
  )
}
