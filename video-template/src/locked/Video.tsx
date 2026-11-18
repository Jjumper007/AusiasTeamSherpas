import type { VideoProps } from '@sherpas/shared'
import { useMemo, type FC } from 'react'
import { AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame, useVideoConfig } from 'remotion'
import { burstsFor } from '../scenes/bursts'
import { AudioCaptionLayer } from './AudioCaptionLayer'
import { useBrandFonts } from './fonts'
import { Bursts } from './stage/Bursts'
import { planShots, SHOT_FRAMING, shotIndexAt, type ShotCue } from './stage/camera'
import { ChapterWipe } from './stage/ChapterWipe'
import { Office } from './stage/Office'
import { Presenter } from './stage/Presenter'
import { Screen } from './stage/Screen'
import { speechTimeline } from './stage/speech'
import { sceneFrameRanges, totalFrames } from './timing'
import { FONT, OFFICE, VIDEO } from './tokens'

/**
 * LOCKED. The base video (branch `Video-Arturo`): a presenter in an office explains the plan on a
 * screen, with camera cuts, a chapter wipe between parts and karaoke captions. The five parts of
 * the arc play in order on the screen, each for its own duration, with their audio and captions.
 */

/** Frames the camera takes to move from one shot to the next. */
const CUT_FRAMES = 14
/** The camera keeps pushing in slowly after each cut, up to this many frames. */
const PUSH_IN_MAX_FRAMES = 150
const PUSH_IN_PER_FRAME = 0.00018
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
  }
}

export const Video: FC<VideoProps> = (props) => {
  useBrandFonts()
  const { script, scenes } = props
  const frame = useCurrentFrame()
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

  const camera = cameraAt(shots, frame)
  const driftX = Math.sin(frame / 47) * 5
  const driftY = Math.cos(frame / 61) * 4
  const x = VIDEO.width / 2 - camera.cx * camera.scale + driftX
  const y = VIDEO.height / 2 - camera.cy * camera.scale + driftY

  return (
    <AbsoluteFill style={{ fontFamily: FONT.body, background: OFFICE.wallBottom, overflow: 'hidden' }}>
      <AbsoluteFill style={{ transformOrigin: '0 0', translate: `${x}px ${y}px`, scale: String(camera.scale) }}>
        <Office />
        <Screen {...props} ranges={ranges} totalFrames={totalFrames(scenes, fps)} />
        <Presenter lines={lines} />
      </AbsoluteFill>
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
    </AbsoluteFill>
  )
}
