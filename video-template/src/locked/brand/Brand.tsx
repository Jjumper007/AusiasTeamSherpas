import type { CSSProperties, FC } from 'react'
import { AbsoluteFill, random, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { COLORS, STAGE_BACKGROUND } from '../tokens'
import { LOGO_PATHS, WORDMARK_BOX, YAK_PATHS, YAK_BOX } from './marks'

/**
 * LOCKED. Sherpas brand art for the video (Video 4.0): the wordmark and the yak, their animated
 * entrances, and the navy hero backdrop of the opening and closing. Unlike Video 4.0 there are no
 * mountain ridges (the team dropped the mountain metaphor) and no sheen across the letters
 * (DESIGN.md: no gradient text).
 */

interface MarkProps {
  readonly width: number
  readonly color?: string
  readonly style?: CSSProperties
}

export const Wordmark: FC<MarkProps> = ({ width, color = COLORS.white, style }) => (
  <svg
    viewBox={`${WORDMARK_BOX.x} ${WORDMARK_BOX.y} ${WORDMARK_BOX.width} ${WORDMARK_BOX.height}`}
    width={width}
    height={(width * WORDMARK_BOX.height) / WORDMARK_BOX.width}
    style={{ overflow: 'visible', display: 'block', ...style }}
  >
    {LOGO_PATHS.map((d) => (
      <path key={d} d={d} fill={color} />
    ))}
  </svg>
)

const Yak: FC<MarkProps> = ({ width, color = COLORS.white, style }) => (
  <svg
    viewBox={`${YAK_BOX.x} ${YAK_BOX.y} ${YAK_BOX.width} ${YAK_BOX.height}`}
    width={width}
    height={(width * YAK_BOX.height) / YAK_BOX.width}
    style={{ overflow: 'visible', display: 'block', ...style }}
  >
    {YAK_PATHS.map((d) => (
      <path key={d} d={d} fill={color} />
    ))}
  </svg>
)

/** Frames between one letter of the wordmark and the next as they rise in. */
const LETTER_STAGGER = 4
const RISE_PX = 80
const BLUR_PX = 10

/** The wordmark, letter by letter: each one rises and sharpens. */
const AnimatedWordmark: FC<{ readonly width: number; readonly startFrame: number }> = ({ width, startFrame }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  return (
    <svg
      viewBox={`${WORDMARK_BOX.x} ${WORDMARK_BOX.y} ${WORDMARK_BOX.width} ${WORDMARK_BOX.height}`}
      width={width}
      height={(width * WORDMARK_BOX.height) / WORDMARK_BOX.width}
      style={{ overflow: 'visible', display: 'block' }}
    >
      {LOGO_PATHS.map((d, index) => {
        const rise = spring({ frame: frame - (startFrame + index * LETTER_STAGGER), fps, config: { damping: 15, stiffness: 120 } })
        return (
          <g
            key={d}
            transform={`translate(0 ${(1 - rise) * RISE_PX})`}
            opacity={Math.min(1, rise * 1.5)}
            style={{ filter: rise < 0.97 ? `blur(${(1 - Math.min(1, rise)) * BLUR_PX}px)` : undefined }}
          >
            <path d={d} fill={COLORS.white} />
          </g>
        )
      })}
    </svg>
  )
}

/** The yak rises into place, then breathes. */
const AnimatedYak: FC<{ readonly width: number; readonly startFrame: number }> = ({ width, startFrame }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const rise = spring({ frame: frame - startFrame, fps, config: { damping: 16, stiffness: 90 } })
  return (
    <div
      style={{
        opacity: Math.min(1, rise * 1.4),
        translate: `0px ${(1 - rise) * 90 + Math.sin(frame / 26) * 4}px`,
        scale: String(0.92 + 0.08 * rise),
        filter: rise < 0.97 ? `blur(${(1 - Math.min(1, rise)) * BLUR_PX}px)` : undefined,
      }}
    >
      <Yak width={width} />
    </div>
  )
}

/** The wordmark starts this many frames after the yak. */
const WORDMARK_AFTER_YAK = 14

/** The logo lockup of the opening and closing: the yak above the wordmark, with a soft blue glow. */
export const BrandLockup: FC<{ readonly startFrame: number }> = ({ startFrame }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 46,
      filter: 'drop-shadow(0 0 28px rgba(101,134,252,0.35))',
    }}
  >
    <AnimatedYak width={300} startFrame={startFrame} />
    <AnimatedWordmark width={700} startFrame={startFrame + WORDMARK_AFTER_YAK} />
  </div>
)

const STAR_COUNT = 70
const STAR_FIELD = { width: 1920, height: 1080 } as const

/** The navy hero world (DESIGN.md "stage"): the stage gradient under faint, twinkling ice stars. */
export const NavyBackdrop: FC = () => {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill style={{ background: STAGE_BACKGROUND }}>
      {Array.from({ length: STAR_COUNT }, (_, index) => {
        const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(frame / (30 + random(`ss${index}`) * 40) + index))
        const size = 2 + random(`sz${index}`) * 3
        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: random(`sx${index}`) * STAR_FIELD.width,
              top: random(`sy${index}`) * STAR_FIELD.height,
              width: size,
              height: size,
              borderRadius: '50%',
              background: 'rgba(224,238,255,0.55)',
              opacity: twinkle,
            }}
          />
        )
      })}
    </AbsoluteFill>
  )
}
