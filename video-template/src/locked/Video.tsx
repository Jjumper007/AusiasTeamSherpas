import type { VideoProps } from '@sherpas/shared'
import type { FC } from 'react'
import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion'
import { SCENES } from '../scenes'
import { AudioCaptionLayer } from './AudioCaptionLayer'
import { sceneFrameRanges } from './timing'
import { COLORS, FONT } from './tokens'

/** LOCKED. Plays the five scenes in arc order, each for its own duration, with audio and captions on top. */
export const Video: FC<VideoProps> = ({ brief, script, facts, scenes }) => {
  const { fps } = useVideoConfig()
  const ranges = sceneFrameRanges(scenes, fps)

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.skyBottom, fontFamily: FONT.family }}>
      {script.scenes.map((scene, index) => {
        const Scene = SCENES[scene.part]
        const { from, durationInFrames } = ranges[index]
        return (
          <Sequence key={scene.part} from={from} durationInFrames={durationInFrames}>
            <Scene
              brief={brief}
              facts={facts}
              scene={scene}
              chapter={script.chapters[index]}
              durationInFrames={durationInFrames}
            />
            <AudioCaptionLayer narration={scene.narration} timing={scenes[index]} />
          </Sequence>
        )
      })}
    </AbsoluteFill>
  )
}
