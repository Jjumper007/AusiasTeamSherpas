import type { Chapter } from '@sherpas/shared'
import type { FC } from 'react'
import { Easing, interpolate, useCurrentFrame } from 'remotion'
import type { FrameRange } from '../timing'
import { COLORS, FONT } from '../tokens'

/**
 * LOCKED. The chapter wipe of the base video: a slanted band crosses the frame at every scene
 * change, carrying the number and title of the chapter that starts.
 */

/** The band takes this many frames to reach the middle of the frame, and as many to leave. */
const HALF_WIPE_FRAMES = 11
const TRAVEL_PX = 2700
const SKEW_DEG = 14
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

const chapterNumber = (index: number): string => String(index).padStart(2, '0')

export const ChapterWipe: FC<{ readonly ranges: readonly FrameRange[]; readonly chapters: readonly Chapter[] }> = ({
  ranges,
  chapters,
}) => {
  const frame = useCurrentFrame()
  const index = ranges.findIndex(
    (range, i) => i > 0 && frame >= range.from - HALF_WIPE_FRAMES && frame <= range.from + HALF_WIPE_FRAMES,
  )
  if (index <= 0) return null

  const middle = ranges[index].from
  const progress = interpolate(frame, [middle - HALF_WIPE_FRAMES, middle + HALF_WIPE_FRAMES], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  })
  const x = interpolate(progress, [0, 1], [-TRAVEL_PX, TRAVEL_PX])

  return (
    <div
      style={{
        position: 'absolute',
        left: x - 400,
        top: -100,
        width: 2720,
        height: 1280,
        transform: `skewX(-${SKEW_DEG}deg)`,
        display: 'flex',
      }}
    >
      <div style={{ width: 120, background: COLORS.lavender }} />
      <div style={{ flex: 1, background: COLORS.brandBlue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            transform: `skewX(${SKEW_DEG}deg)`,
            display: 'flex',
            gap: 30,
            alignItems: 'baseline',
            maxWidth: 1500,
            fontFamily: FONT.display,
            fontWeight: 600,
            letterSpacing: FONT.displayTracking,
            fontSize: 96,
            color: COLORS.white,
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ color: COLORS.ice, opacity: 0.7 }}>{chapterNumber(index)}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{chapters[index]?.title}</span>
        </div>
      </div>
      <div style={{ width: 120, background: COLORS.navy }} />
    </div>
  )
}
