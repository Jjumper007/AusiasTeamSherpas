import type { FC } from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { Advisor, ADVISOR_POSES, type ArmSet } from './Advisor'
import { lineIndexAt, type AdvisorPose, type SpokenLine } from './speech'

/**
 * LOCKED. The presenter walks in, then gestures, blinks, breathes, shifts his weight and talks along
 * with the narration (Video 4.0 motion).
 */

const WIDTH = 470
const STAND = { x: 70, y: 222 } as const
const ENTER_FROM_X = -520
/** The mouth stops a little before the cue ends, so it does not flap over silence. */
const MOUTH_TAIL_SEC = 0.2

type Point = readonly [number, number]
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
const lerpPoint = (a: Point, b: Point, t: number): Point => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]
const blendArms = (a: ArmSet, b: ArmSet, t: number): ArmSet => ({
  le: lerpPoint(a.le, b.le, t),
  lh: lerpPoint(a.lh, b.lh, t),
  re: lerpPoint(a.re, b.re, t),
  rh: lerpPoint(a.rh, b.rh, t),
})
/** The elbows drift a little even at rest, so the presenter never freezes. */
const idleElbows = (arms: ArmSet, frame: number): ArmSet => ({
  ...arms,
  le: [arms.le[0], arms.le[1] + Math.sin(frame / 31) * 1.5],
  re: [arms.re[0], arms.re[1] + Math.sin(frame / 29 + 1) * 1.5],
})
const leanOf = (pose: AdvisorPose): number => (pose === 'point' || pose === 'present' ? 3 : pose === 'think' ? -2 : 0)

/** Small hand movements while speaking, by kind of gesture. */
const gesture = (arms: ArmSet, pose: AdvisorPose, frame: number): ArmSet => {
  if (pose === 'explain' || pose === 'welcome') {
    const dx = Math.sin(frame / 7) * 6
    const dy = Math.sin(frame / 5.5) * 7
    return { ...arms, lh: [arms.lh[0] - dx, arms.lh[1] + dy], rh: [arms.rh[0] + dx, arms.rh[1] - dy] }
  }
  if (pose === 'point' || pose === 'present') {
    return { ...arms, rh: [arms.rh[0] + Math.sin(frame / 4.5) * 5, arms.rh[1] + Math.sin(frame / 6) * 4] }
  }
  if (pose === 'count' || pose === 'thumbsUp') {
    return { ...arms, rh: [arms.rh[0], arms.rh[1] - Math.abs(Math.sin(frame / 6)) * 8] }
  }
  return arms
}

export const Presenter: FC<{ readonly lines: readonly SpokenLine[] }> = ({ lines }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const timeSec = frame / fps

  const index = lineIndexAt(lines, timeSec)
  const line = index >= 0 ? lines[index] : undefined
  const previousPose: AdvisorPose = index > 0 ? lines[index - 1].pose : 'idle'
  const pose: AdvisorPose = line?.pose ?? 'idle'
  const lineStartFrame = line ? Math.round(line.startSec * fps) : 0
  const blend = line ? spring({ frame: frame - lineStartFrame, fps, config: { damping: 12, stiffness: 150 } }) : 1

  const speaking = line !== undefined && timeSec >= line.startSec && timeSec < line.endSec - MOUTH_TAIL_SEC
  const baseArms = blendArms(ADVISOR_POSES[previousPose], ADVISOR_POSES[pose], blend)
  const arms = idleElbows(speaking ? gesture(baseArms, pose, frame) : baseArms, frame)
  const mouth = speaking ? Math.max(0, Math.sin(frame * 0.9) * 0.6 + Math.sin(frame * 0.33 + 1) * 0.4) : 0

  const enter = spring({ frame, fps, config: { damping: 16, stiffness: 80 } })
  const x = interpolate(enter, [0, 1], [ENTER_FROM_X, STAND.x])
  const walkBob = enter < 0.98 ? -Math.abs(Math.sin(frame / 3)) * 10 : 0
  const hop =
    line && pose === 'thumbsUp'
      ? -Math.max(0, Math.sin(Math.min(1, (frame - lineStartFrame) / 12) * Math.PI)) * 22
      : 0
  const weightShift = Math.sin(frame / 61) * 6

  return (
    <div style={{ position: 'absolute', left: x + weightShift, top: STAND.y + walkBob + hop }}>
      <Advisor
        arms={arms}
        handStyle={blend > 0.5 ? pose : previousPose}
        expr={line?.expr ?? 'happy'}
        mouth={mouth}
        blink={frame % 97 < 4 || frame % 163 < 3}
        breath={Math.sin(timeSec * Math.PI) * 2}
        headTilt={Math.sin(frame / 23) * 2 + (speaking ? Math.sin(frame / 8) * 2 : 0)}
        lean={lerp(leanOf(previousPose), leanOf(pose), blend)}
        look={pose === 'point' || pose === 'present' ? 3 : 1}
        width={WIDTH}
      />
    </div>
  )
}
