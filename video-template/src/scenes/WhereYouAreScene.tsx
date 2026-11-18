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

const CLIMB_START_FRAME = 10
const CLIMB_SHARE = 0.5

/** Part 2: where you are. The family climbs to its score, read as altitude on the altimeter. */
export const WhereYouAreScene: FC<SceneProps> = ({
  brief,
  facts,
  scene,
  chapter,
  durationInFrames,
}) => {
  const frame = useCurrentFrame()
  const climb = ease(frame, CLIMB_START_FRAME, durationInFrames * CLIMB_SHARE)
  // The figure on screen is the score fact the script declares. The brief only places the hikers.
  const [scoreFact] = pointsFacts(scene, facts)
  const score = lerp(0, scoreFact?.value ?? brief.score.value, climb)

  return (
    <AbsoluteFill>
      <Backdrop />
      <Hikers household={brief.household} fraction={fractionForScore(score)} />
      <Panel title={chapter.title}>
        {scoreFact ? (
          <Altimeter value={score} caption={brief.score.band} />
        ) : (
          <BodyText>{chapter.body}</BodyText>
        )}
      </Panel>
    </AbsoluteFill>
  )
}
