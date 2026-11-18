import type { SceneTiming } from '@sherpas/shared'
import type { FC } from 'react'
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { activeCue, cuesForScene } from './captions'
import { fadeInOut } from './fade'
import { COLORS, FONT } from './tokens'

/**
 * LOCKED. Plays the scene's narration (silent when there is no audio yet) and shows its captions
 * as karaoke, as in the base video: words light up as they are said, and figures stand out.
 */

const CAPTION_MAX_WIDTH = 1560
const CAPTION_BOTTOM = 40
const FADE_FRAMES = 4
/** Words are spread over the cue minus this tail, so the last word lights before the cue ends. */
const KARAOKE_TAIL_SEC = 0.4
const WORD_POP_SEC = [0, 0.12, 0.25] as const
/** Peak scale of a word as it is said; kept small so a long word never touches its neighbours. */
const WORD_POP_SCALE = 1.06
const WORD_GAP_PX = 7
const UNSAID_OPACITY = 0.4
const FIGURE_PATTERN = /[$%0-9]/
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

const audioSource = (audioFile: string): string => (/^https?:\/\//.test(audioFile) ? audioFile : staticFile(audioFile))

interface Word {
  readonly text: string
  readonly startSec: number
}

/** Each word starts in proportion to the characters before it. */
const timeWords = (text: string, startSec: number, spanSec: number): Word[] => {
  const words = text.split(' ').filter((word) => word.length > 0)
  const totalChars = text.length
  return words.reduce<{ readonly words: Word[]; readonly chars: number }>(
    (acc, word) => ({
      words: [...acc.words, { text: word, startSec: startSec + (acc.chars / totalChars) * spanSec }],
      chars: acc.chars + word.length + 1,
    }),
    { words: [], chars: 0 },
  ).words
}

interface AudioCaptionLayerProps {
  readonly narration: string
  readonly timing: SceneTiming
}

export const AudioCaptionLayer: FC<AudioCaptionLayerProps> = ({ narration, timing }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const timeSec = frame / fps
  const cue = activeCue(cuesForScene(narration, timing), timeSec)

  const caption = (() => {
    if (!cue) return null
    const shown = fadeInOut(frame, Math.round(cue.startSec * fps), Math.round(cue.endSec * fps), FADE_FRAMES)
    const words = timeWords(cue.text, cue.startSec, Math.max(0, cue.endSec - cue.startSec - KARAOKE_TAIL_SEC))
    return (
      <div
        style={{
          maxWidth: CAPTION_MAX_WIDTH,
          padding: '14px 34px',
          borderRadius: 18,
          background: 'rgba(22, 24, 39, 0.88)',
          fontFamily: FONT.body,
          fontSize: 42,
          fontWeight: 600,
          lineHeight: 1.3,
          textAlign: 'center',
          opacity: shown,
          translate: `0px ${(1 - shown) * 14}px`,
          scale: String(interpolate(shown, [0, 1], [0.96, 1])),
        }}
      >
        {words.map((word, index) => {
          const said = timeSec >= word.startSec
          const pop = said ? interpolate(timeSec - word.startSec, [...WORD_POP_SEC], [1, WORD_POP_SCALE, 1], clamp) : 1
          return (
            <span
              key={index}
              style={{
                display: 'inline-block',
                margin: `0 ${WORD_GAP_PX}px`,
                color: FIGURE_PATTERN.test(word.text) ? COLORS.sky : COLORS.white,
                opacity: said ? 1 : UNSAID_OPACITY,
                scale: String(pop),
              }}
            >
              {word.text}
            </span>
          )
        })}
      </div>
    )
  })()

  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: CAPTION_BOTTOM }}>
      {timing.audioFile ? <Audio src={audioSource(timing.audioFile)} /> : null}
      {caption}
    </AbsoluteFill>
  )
}
