import type { VideoProps } from '@sherpas/shared'
import type { FC, ReactNode } from 'react'
import { AbsoluteFill, Easing, interpolate, random, Sequence, useCurrentFrame } from 'remotion'
import { SCENES } from '../../scenes'
import { Wordmark } from '../brand/Brand'
import type { FrameRange } from '../timing'
import { COLORS, RADIUS, SCREEN_BEZEL, SCREEN_CONTENT, SCREEN_INNER, SHADOW } from '../tokens'

/**
 * LOCKED. The presentation screen on the office wall (Video 4.0). Each part of the arc is drawn by
 * its scene component (editable, in `src/scenes/`) at 1500×900 over a light backdrop with drifting
 * particles, and swiped in and out with a blur; a faint wordmark and one dot per part sit on top.
 */

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1)
const SWIPE_IN_FRAMES = 18
const SWIPE_OUT_FRAMES = 10
const SWIPE_IN_PX = 150
const SWIPE_OUT_PX = 170
const SWIPE_BLUR_PX = 10
/** The screen switches on with a white flash just after the video starts. */
const POWER_ON = { start: 12, flash: 15, fullyOn: 24, flashEnd: 30 } as const
const PARTICLE_COUNT = 16

const Swipe: FC<{ readonly durationInFrames: number; readonly children: ReactNode }> = ({ durationInFrames, children }) => {
  const frame = useCurrentFrame()
  const enter = interpolate(frame, [0, SWIPE_IN_FRAMES], [0, 1], { ...clamp, easing: EASE_OUT })
  const leave = interpolate(frame, [durationInFrames - SWIPE_OUT_FRAMES, durationInFrames], [0, 1], {
    ...clamp,
    easing: Easing.in(Easing.cubic),
  })
  const moving = enter < 0.98 || leave > 0
  return (
    <AbsoluteFill
      style={{
        opacity: enter * (1 - leave),
        translate: `${(1 - enter) * SWIPE_IN_PX - leave * SWIPE_OUT_PX}px 0px`,
        scale: String(0.95 + 0.05 * enter + 0.03 * leave),
        filter: moving ? `blur(${(1 - enter + leave) * SWIPE_BLUR_PX}px)` : undefined,
      }}
    >
      {children}
    </AbsoluteFill>
  )
}

/** The light app frame behind every scene, with soft particles drifting down. */
const Backdrop: FC = () => {
  const frame = useCurrentFrame()
  const height = SCREEN_CONTENT.height
  return (
    <AbsoluteFill style={{ background: COLORS.frame }}>
      {Array.from({ length: PARTICLE_COUNT }, (_, index) => {
        const x = random(`px${index}`) * SCREEN_CONTENT.width
        const startY = random(`py${index}`) * height
        const y = (((startY + frame * (0.35 + random(`ps${index}`) * 0.45)) % height) + height) % height
        const size = 5 + random(`pz${index}`) * 7
        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: x + Math.sin(frame / 45 + index) * 20,
              top: y,
              width: size,
              height: size,
              borderRadius: '50%',
              background: COLORS.blueLine,
              opacity: 0.7,
            }}
          />
        )
      })}
    </AbsoluteFill>
  )
}

const PartDots: FC<{ readonly count: number; readonly active: number }> = ({ count, active }) => (
  <div style={{ position: 'absolute', right: 40, top: 40, display: 'flex', gap: 10 }}>
    {Array.from({ length: count }, (_, index) => (
      <div
        key={index}
        style={{
          width: index === active ? 40 : 12,
          height: 12,
          borderRadius: RADIUS.pill,
          background: index <= active ? COLORS.brandBlue : COLORS.hairline,
        }}
      />
    ))}
  </div>
)

/** The stand under the screen: a neck and a base. */
const Stand: FC = () => (
  <>
    <div
      style={{
        position: 'absolute',
        left: SCREEN_BEZEL.x + SCREEN_BEZEL.width / 2 - 70,
        top: SCREEN_BEZEL.y + SCREEN_BEZEL.height - 4,
        width: 140,
        height: 40,
        background: `linear-gradient(180deg, ${COLORS.navySurfaceRaised}, ${COLORS.navySurface})`,
      }}
    />
    <div
      style={{
        position: 'absolute',
        left: SCREEN_BEZEL.x + SCREEN_BEZEL.width / 2 - 190,
        top: SCREEN_BEZEL.y + SCREEN_BEZEL.height + 32,
        width: 380,
        height: 18,
        borderRadius: 9,
        background: COLORS.navySurface,
      }}
    />
  </>
)

interface ScreenProps extends VideoProps {
  readonly ranges: readonly FrameRange[]
}

export const Screen: FC<ScreenProps> = ({ brief, facts, script, ranges }) => {
  const frame = useCurrentFrame()
  const on = interpolate(frame, [POWER_ON.start, POWER_ON.fullyOn], [0, 1], clamp)
  const flash = interpolate(frame, [POWER_ON.start, POWER_ON.flash, POWER_ON.flashEnd], [0, 0.9, 0], clamp)
  const activePart = ranges.findIndex((range) => frame >= range.from && frame < range.from + range.durationInFrames)

  return (
    <>
      <Stand />
      <div
        style={{
          position: 'absolute',
          left: SCREEN_BEZEL.x,
          top: SCREEN_BEZEL.y,
          width: SCREEN_BEZEL.width,
          height: SCREEN_BEZEL.height,
          borderRadius: 26,
          background: `linear-gradient(160deg, ${COLORS.navySurfaceRaised}, ${COLORS.navyDeep})`,
          boxShadow: SHADOW.stage,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: SCREEN_BEZEL.x + SCREEN_BEZEL.width / 2 - 5,
          top: SCREEN_BEZEL.y + 8,
          width: 10,
          height: 10,
          borderRadius: 5,
          background: on > 0.5 ? COLORS.gainGreen : '#454B73',
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
          <Backdrop />
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
          <div style={{ position: 'absolute', left: 40, top: SCREEN_CONTENT.height - 58, opacity: 0.28 }}>
            <Wordmark width={120} color="#0E1C29" />
          </div>
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
          background: 'linear-gradient(120deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 38%)',
        }}
      />
    </>
  )
}
