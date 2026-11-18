import type { FC } from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { Altimeter } from '../components/Altimeter'
import { Backdrop } from '../components/Backdrop'
import { Hikers } from '../components/Hikers'
import { Panel } from '../components/Panel'
import { fractionForScore } from '../components/trail'
import { ease, lerp } from './motion'
import type { SceneProps } from './types'

const CLIMB_START_FRAME = 10
const CLIMB_SHARE = 0.5

/** Part 2: where you are. The family climbs to its score, read as altitude on the altimeter. */
export const WhereYouAreScene: FC<SceneProps> = ({ brief, chapter, durationInFrames }) => {
  const frame = useCurrentFrame()
  const climb = ease(frame, CLIMB_START_FRAME, durationInFrames * CLIMB_SHARE)
  const score = lerp(0, brief.score.value, climb)

  return (
    <AbsoluteFill>
      <Backdrop />
      <Hikers household={brief.household} fraction={fractionForScore(score)} />
      <Panel title={chapter.title}>
        <Altimeter value={score} caption={brief.score.band} />
      </Panel>
    </AbsoluteFill>
  )
}
