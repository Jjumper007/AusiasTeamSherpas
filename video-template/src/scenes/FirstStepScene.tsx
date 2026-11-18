import type { FC } from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { Backdrop } from '../components/Backdrop'
import { Backpack } from '../components/Backpack'
import { Hikers } from '../components/Hikers'
import { Panel } from '../components/Panel'
import { fractionForScore } from '../components/trail'
import type { SceneProps } from './types'

/** Share of the scene after which the first piece of gear goes into the pack. */
const PACKED_AFTER_SHARE = 0.55
const PANEL_WIDTH = 900

/** Part 4: your first step. Each top move is gear missing from the pack; the first one gets packed. */
export const FirstStepScene: FC<SceneProps> = ({ brief, chapter, durationInFrames }) => {
  const frame = useCurrentFrame()
  const firstIsPacked = frame > durationInFrames * PACKED_AFTER_SHARE
  const items = brief.topMoves.map((move, index) => ({
    label: move.title,
    packed: index === 0 && firstIsPacked,
  }))

  return (
    <AbsoluteFill>
      <Backdrop />
      <Hikers household={brief.household} fraction={fractionForScore(brief.score.value)} />
      <Panel title={chapter.title} width={PANEL_WIDTH}>
        <Backpack items={items} />
      </Panel>
    </AbsoluteFill>
  )
}
