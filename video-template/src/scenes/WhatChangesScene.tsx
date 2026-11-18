import { fmt } from '@sherpas/shared'
import type { FC } from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { Altimeter } from '../components/Altimeter'
import { Backdrop } from '../components/Backdrop'
import { Hikers } from '../components/Hikers'
import { BodyText, Panel } from '../components/Panel'
import { fractionForScore } from '../components/trail'
import { ease, lerp } from './motion'
import { pointsFacts } from './scene-facts'
import type { SceneProps } from './types'

const CLIMB_START_FRAME = 15
const CLIMB_SHARE = 0.6

/** Part 5: what changes if you take the step. The family climbs one stretch: score before → score after. */
export const WhatChangesScene: FC<SceneProps> = ({
  brief,
  facts,
  scene,
  chapter,
  durationInFrames,
}) => {
  const frame = useCurrentFrame()
  const [firstMove] = brief.topMoves
  const climb = ease(frame, CLIMB_START_FRAME, durationInFrames * CLIMB_SHARE)
  // The figures on screen are the first two score facts the script declares: before and after.
  const [before, after] = pointsFacts(scene, facts)
  const score = lerp(
    before?.value ?? firstMove.scoreBefore,
    after?.value ?? firstMove.scoreAfter,
    climb,
  )

  return (
    <AbsoluteFill>
      <Backdrop />
      <Hikers household={brief.household} fraction={fractionForScore(score)} />
      <Panel title={chapter.title}>
        {before && after ? (
          <>
            <Altimeter value={score} caption={firstMove.title} />
            <BodyText>
              {fmt.fact(before)} → {fmt.fact(after)}
            </BodyText>
          </>
        ) : (
          <BodyText>{chapter.body}</BodyText>
        )}
      </Panel>
    </AbsoluteFill>
  )
}
