import type { FC } from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { Backdrop } from '../components/Backdrop'
import { Hikers } from '../components/Hikers'
import { BodyText, Panel } from '../components/Panel'
import { ease } from './motion'
import type { SceneProps } from './types'

const TRAILHEAD_FRACTION = 0.05
const HIKER_SCALE = 1.6
const SUNRISE_SHARE = 0.8

const joinNames = (names: readonly string[]): string =>
  names.length <= 1
    ? names.join('')
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`

/** Part 1: the personal hook. Sunrise over the route, the whole family at the trailhead. */
export const HookScene: FC<SceneProps> = ({ brief, durationInFrames }) => {
  const frame = useCurrentFrame()
  const companions = brief.household
    .filter((person) => person.firstName !== brief.member.firstName)
    .map((person) => person.firstName)

  return (
    <AbsoluteFill>
      <Backdrop sunProgress={ease(frame, 0, durationInFrames * SUNRISE_SHARE)} />
      <Hikers household={brief.household} fraction={TRAILHEAD_FRACTION} scale={HIKER_SCALE} />
      <Panel title={`${brief.survey.nickname}, here is your route.`}>
        {companions.length > 0 ? <BodyText>With {joinNames(companions)}.</BodyText> : null}
      </Panel>
    </AbsoluteFill>
  )
}
