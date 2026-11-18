import type { FC } from 'react'
import { useCurrentFrame } from 'remotion'
import { COLORS } from '../locked/tokens'
import { tween } from '../scenes/motion'
import { titleText } from './ui'

const MAX_WIDTH = 1180
const UNDERLINE_PX = 150
/** Long chapter titles step down so they stay on one line. */
const LONG_TITLE_CHARS = 30
const FONT_SIZE = { short: 66, long: 52 } as const
/** Each word starts rising this many frames after the one before. */
const WORD_STAGGER = 2

/**
 * The screen title of the base video (Video 4.0): each word rises out of a mask, then a
 * brand-blue rule grows under it. No kicker above it (DESIGN.md).
 */
export const Heading: FC<{ readonly title: string }> = ({ title }) => {
  const frame = useCurrentFrame()
  const words = title.split(' ').filter((word) => word.length > 0)
  const fontSize = title.length > LONG_TITLE_CHARS ? FONT_SIZE.long : FONT_SIZE.short
  return (
    <div style={{ position: 'absolute', left: 70, top: 50, maxWidth: MAX_WIDTH }}>
      <div style={{ ...titleText, fontSize, lineHeight: 1.1, display: 'flex', gap: fontSize * 0.27, whiteSpace: 'nowrap', overflow: 'hidden' }}>
        {words.map((word, index) => {
          const rise = tween(frame, 2 + index * WORD_STAGGER, 14 + index * WORD_STAGGER, 0, 1)
          return (
            <span key={index} style={{ display: 'inline-block', overflow: 'hidden', paddingBottom: 8, marginBottom: -8 }}>
              <span
                style={{
                  display: 'inline-block',
                  translate: `0px ${(1 - rise) * 100}%`,
                  rotate: `${(1 - rise) * 4}deg`,
                  transformOrigin: '0 100%',
                }}
              >
                {word}
              </span>
            </span>
          )
        })}
      </div>
      <div style={{ width: tween(frame, 8, 28, 0, UNDERLINE_PX), height: 6, borderRadius: 3, background: COLORS.brandBlue, marginTop: 8 }} />
    </div>
  )
}
