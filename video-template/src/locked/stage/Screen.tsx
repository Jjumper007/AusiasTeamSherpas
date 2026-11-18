import type { VideoProps } from '@sherpas/shared'
import type { FC, ReactNode } from 'react'
import { AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame } from 'remotion'
import { SCENES } from '../../scenes'
import type { FrameRange } from '../timing'
import { COLORS, RADIUS, SCREEN_BEZEL, SCREEN_CONTENT, SCREEN_INNER, SHADOW } from '../tokens'

/**
 * LOCKED. The presentation screen on the office wall. Each part of the arc is drawn by its scene
 * component (editable, in `src/scenes/`) at 1500×900 and swiped in and out; a progress bar and
 * one dot per part sit on top.
 */

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
const SWIPE_IN_FRAMES = 12
const SWIPE_OUT_FRAMES = 8
const SWIPE_PX = 160
const PROGRESS_HEIGHT = 10
/** The screen switches on with a white flash just after the video starts. */
const POWER_ON = { start: 12, flash: 15, end: 30 } as const

const Swipe: FC<{ readonly durationInFrames: number; readonly children: ReactNode }> = ({ durationInFrames, children }) => {
  const frame = useCurrentFrame()
  const enter = interpolate(frame, [0, SWIPE_IN_FRAMES], [0, 1], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) })
  const leave = interpolate(frame, [durationInFrames - SWIPE_OUT_FRAMES, durationInFrames], [0, 1], {
    ...clamp,
    easing: Easing.in(Easing.cubic),
  })
  return (
    <AbsoluteFill style={{ opacity: enter * (1 - leave), translate: `${(1 - enter) * SWIPE_PX - leave * SWIPE_PX}px 0px` }}>
      {children}
    </AbsoluteFill>
  )
}

const PartDots: FC<{ readonly count: number; readonly active: number }> = ({ count, active }) => (
  <div style={{ position: 'absolute', right: 40, top: 40, display: 'flex', gap: 10 }}>
    {Array.from({ length: count }, (_, index) => (
      <div
        key={index}
        style={{
          width: index === active ? 34 : 12,
          height: 12,
          borderRadius: RADIUS.pill,
          background: index <= active ? COLORS.brandBlue : COLORS.hairline,
        }}
      />
    ))}
  </div>
)

interface ScreenProps extends VideoProps {
  readonly ranges: readonly FrameRange[]
  readonly totalFrames: number
}

export const Screen: FC<ScreenProps> = ({ brief, facts, script, ranges, totalFrames }) => {
  const frame = useCurrentFrame()
  const on = interpolate(frame, [POWER_ON.start, POWER_ON.end], [0, 1], clamp)
  const flash = interpolate(frame, [POWER_ON.start, POWER_ON.flash, POWER_ON.end], [0, 0.9, 0], clamp)
  const activePart = ranges.findIndex((range) => frame >= range.from && frame < range.from + range.durationInFrames)

  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: SCREEN_BEZEL.x,
          top: SCREEN_BEZEL.y,
          width: SCREEN_BEZEL.width,
          height: SCREEN_BEZEL.height,
          borderRadius: 26,
          background: COLORS.navy,
          boxShadow: SHADOW.stage,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: SCREEN_INNER.x,
          top: SCREEN_INNER.y,
          width: SCREEN_INNER.width,
          height: SCREEN_INNER.height,
          borderRadius: 12,
          overflow: 'hidden',
          background: on > 0 ? COLORS.frame : COLORS.navyDeep,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: SCREEN_CONTENT.width,
            height: SCREEN_CONTENT.height,
            scale: String(SCREEN_INNER.scale),
            transformOrigin: '0 0',
            opacity: on,
          }}
        >
          {script.scenes.map((scene, index) => {
            const Scene = SCENES[scene.part]
            const { from, durationInFrames } = ranges[index]
            return (
              <Sequence key={scene.part} from={from} durationInFrames={durationInFrames} name={scene.part} layout="none">
                <Swipe durationInFrames={durationInFrames}>
                  <Scene
                    brief={brief}
                    facts={facts}
                    scene={scene}
                    chapter={script.chapters[index]}
                    cta={script.cta}
                    durationInFrames={durationInFrames}
                  />
                </Swipe>
              </Sequence>
            )
          })}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: SCREEN_CONTENT.height - PROGRESS_HEIGHT,
              width: SCREEN_CONTENT.width,
              height: PROGRESS_HEIGHT,
              background: COLORS.hairline,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: SCREEN_CONTENT.height - PROGRESS_HEIGHT,
              width: (SCREEN_CONTENT.width * frame) / totalFrames,
              height: PROGRESS_HEIGHT,
              background: COLORS.brandBlue,
            }}
          />
          <PartDots count={ranges.length} active={activePart} />
        </div>
        <div style={{ position: 'absolute', inset: 0, background: COLORS.white, opacity: flash }} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: SCREEN_INNER.x,
          top: SCREEN_INNER.y,
          width: SCREEN_INNER.width,
          height: SCREEN_INNER.height,
          borderRadius: 12,
          background: 'linear-gradient(120deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 35%)',
        }}
      />
    </>
  )
}
