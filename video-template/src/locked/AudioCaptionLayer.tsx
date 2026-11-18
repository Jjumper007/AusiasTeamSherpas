import type { SceneTiming } from '@sherpas/shared'
import type { FC } from 'react'
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { activeCue, cuesForScene } from './captions'
import { COLORS, FONT, RADIUS, SAFE_MARGIN } from './tokens'

const CAPTION_MAX_WIDTH = 1300
const CAPTION_PADDING = '18px 40px'

const audioSource = (audioFile: string): string =>
  /^https?:\/\//.test(audioFile) ? audioFile : staticFile(audioFile)

interface AudioCaptionLayerProps {
  readonly narration: string
  readonly timing: SceneTiming
}

/** LOCKED. Plays the scene's narration (silent when there is no audio yet) and shows its captions. */
export const AudioCaptionLayer: FC<AudioCaptionLayerProps> = ({ narration, timing }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const cue = activeCue(cuesForScene(narration, timing), frame / fps)

  return (
    <AbsoluteFill
      style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: SAFE_MARGIN }}
    >
      {timing.audioFile ? <Audio src={audioSource(timing.audioFile)} /> : null}
      {cue ? (
        <div
          style={{
            maxWidth: CAPTION_MAX_WIDTH,
            padding: CAPTION_PADDING,
            borderRadius: RADIUS.card,
            backgroundColor: COLORS.ink,
            color: COLORS.card,
            fontFamily: FONT.family,
            fontWeight: FONT.weightRegular,
            fontSize: FONT.sizeCaption,
            textAlign: 'center',
          }}
        >
          {cue.text}
        </div>
      ) : null}
    </AbsoluteFill>
  )
}
