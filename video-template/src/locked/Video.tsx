import type { VideoProps } from '@sherpas/shared'
import { useMemo, type FC } from 'react'
import { AbsoluteFill, Easing, interpolate, random, Sequence, useCurrentFrame, useVideoConfig } from 'remotion'
import { burstsFor, type Burst } from '../scenes/bursts'
import { AudioCaptionLayer } from './AudioCaptionLayer'
import { Closing, Opening } from './brand/Bookends'
import { useBrandFonts } from './fonts'
import { Soundtrack } from './Soundtrack'
import { Bursts } from './stage/Bursts'
import { planShots, SHOT_FRAMING, shotIndexAt, type ShotCue } from './stage/camera'
import { ChapterWipe } from './stage/ChapterWipe'
import { Office } from './stage/Office'
import { Presenter } from './stage/Presenter'
import { Screen } from './stage/Screen'
import { speechTimeline, type SpokenLine } from './stage/speech'
import { BRAND, burstStartFrame, outroFromFrame, sceneFrameRanges, totalFrames, videoFrames, type FrameRange } from './timing'
import { COLORS, FONT, OFFICE, VIDEO } from './tokens'

/**
 * LOCKED. The base video (branch `Video-Arturo`, Video 4.0): the Sherpas logo opens an iris onto
 * an office where a presenter explains the plan on a screen, with camera cuts, a chapter wipe
 * between parts, callouts and karaoke captions; an iris closes onto the logo. The five parts of
 * the arc play in order on the screen, each for its own duration, with their audio and captions,
 * over a music bed and sound effects.
 */

/** Frames the camera takes to move from one shot to the next. */
const CUT_FRAMES = 14
/** The camera keeps pushing in slowly after each cut, up to this many frames. */
const PUSH_IN_MAX_FRAMES = 180
const PUSH_IN_PER_FRAME = 0.00022
/** Peak blur and roll while the camera moves between shots. */
const MOVE_BLUR_PX = 2.2
const MOVE_ROLL_DEG = 0.5
const DUST_COUNT = 10
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/** Where the camera is at `frame`: eased between the previous shot and the current one, with a slow push-in. */
const cameraAt = (cues: readonly ShotCue[], frame: number) => {
  const index = shotIndexAt(cues, frame)
  const current = SHOT_FRAMING[cues[index].shot]
  const previous = SHOT_FRAMING[cues[Math.max(0, index - 1)].shot]
  const start = cues[index].atFrame
  const t =
    index === 0
      ? 1
      : interpolate(frame, [start, start + CUT_FRAMES], [0, 1], { ...clamp, easing: Easing.bezier(0.65, 0, 0.35, 1) })
  const pushIn = 1 + Math.min(frame - start, PUSH_IN_MAX_FRAMES) * PUSH_IN_PER_FRAME
  return {
    cx: lerp(previous.cx, current.cx, t),
    cy: lerp(previous.cy, current.cy, t),
    scale: lerp(previous.scale, current.scale, t) * pushIn,
    /** 0 at rest, up to 1 halfway through a camera move. */
    move: t < 1 ? Math.sin(t * Math.PI) : 0,
  }
}

/** Specks of dust drifting up in front of the office. */
const Dust: FC = () => {
  const frame = useCurrentFrame()
  return (
    <>
      {Array.from({ length: DUST_COUNT }, (_, index) => {
        const startY = random(`dy${index}`) * VIDEO.height
        const y = (((startY - frame * (0.3 + random(`dv${index}`) * 0.4)) % VIDEO.height) + VIDEO.height) % VIDEO.height
        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: random(`dx${index}`) * VIDEO.width + Math.sin(frame / 50 + index) * 20,
              top: y,
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.7)',
            }}
          />
        )
      })}
    </>
  )
}

interface StageProps extends VideoProps {
  readonly ranges: readonly FrameRange[]
  readonly shots: readonly ShotCue[]
  readonly lines: readonly SpokenLine[]
  readonly bursts: readonly Burst[]
}

/** The five scenes in the office, in frames from the start of the scenes. */
const Stage: FC<StageProps> = ({ ranges, shots, lines, bursts, ...props }) => {
  const frame = useCurrentFrame()
  const { script, scenes } = props
  const camera = cameraAt(shots, frame)
  const driftX = Math.sin(frame / 47) * 6 + Math.sin(frame / 19) * 1.5
  const driftY = Math.cos(frame / 61) * 5 + Math.cos(frame / 23) * 1.5
  const x = VIDEO.width / 2 - camera.cx * camera.scale + driftX
  const y = VIDEO.height / 2 - camera.cy * camera.scale + driftY
  const roll = Math.sin(frame / 70) * 0.18 + camera.move * MOVE_ROLL_DEG

  return (
    <AbsoluteFill style={{ fontFamily: FONT.body, background: OFFICE.backdrop, overflow: 'hidden' }}>
      <AbsoluteFill style={{ transformOrigin: '0 0', translate: `${x}px ${y}px`, scale: String(camera.scale) }}>
        <AbsoluteFill
          style={{
            transformOrigin: `${VIDEO.width / 2}px ${VIDEO.height / 2}px`,
            rotate: `${roll}deg`,
            filter: camera.move > 0.05 ? `blur(${camera.move * MOVE_BLUR_PX}px)` : undefined,
          }}
        >
          <Office />
          <Screen {...props} ranges={ranges} />
          <Presenter lines={lines} />
        </AbsoluteFill>
      </AbsoluteFill>
      <Dust />
      {script.scenes.map((scene, index) => (
        <Sequence
          key={scene.part}
          from={ranges[index].from}
          durationInFrames={ranges[index].durationInFrames}
          name={`${scene.part} audio`}
        >
          <AudioCaptionLayer narration={scene.narration} timing={scenes[index]} />
        </Sequence>
      ))}
      <Bursts bursts={bursts} ranges={ranges} />
      <ChapterWipe ranges={ranges} chapters={script.chapters} />
      <AbsoluteFill
        style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 58%, rgba(15,18,40,0.26) 100%)', pointerEvents: 'none' }}
      />
    </AbsoluteFill>
  )
}

export const Video: FC<VideoProps> = (props) => {
  useBrandFonts()
  const { script, scenes } = props
  const { fps } = useVideoConfig()

  const ranges = useMemo(() => sceneFrameRanges(scenes, fps), [scenes, fps])
  const shots = useMemo(() => planShots(ranges, fps), [ranges, fps])
  const lines = useMemo(
    () =>
      speechTimeline(
        script.scenes.map((scene, index) => ({
          part: scene.part,
          narration: scene.narration,
          timing: scenes[index],
          range: ranges[index],
        })),
        fps,
      ),
    [script, scenes, ranges, fps],
  )
  const bursts = useMemo(() => burstsFor(props), [props])
  const callouts = useMemo(
    () =>
      bursts.flatMap((burst) => {
        const range = ranges[burst.sceneIndex]
        return range ? [{ startFrame: burstStartFrame(burst, range), good: burst.good }] : []
      }),
    [bursts, ranges],
  )
  const contentFrames = totalFrames(scenes, fps)
  const outroFrom = outroFromFrame(scenes, fps)

  return (
    <AbsoluteFill style={{ background: COLORS.navyDeep }}>
      <Soundtrack
        fps={fps}
        ranges={ranges}
        shots={shots}
        callouts={callouts}
        outroFromFrame={outroFrom}
        totalFrames={videoFrames(scenes, fps)}
      />
      <Sequence from={BRAND.contentFromFrame} durationInFrames={contentFrames} name="Scenes" layout="none">
        <Stage {...props} ranges={ranges} shots={shots} lines={lines} bursts={bursts} />
      </Sequence>
      <Sequence from={0} durationInFrames={BRAND.introFrames} name="Opening" layout="none">
        <Opening />
      </Sequence>
      <Sequence from={outroFrom} durationInFrames={BRAND.outroFrames} name="Closing" layout="none">
        <Closing />
      </Sequence>
    </AbsoluteFill>
  )
}
