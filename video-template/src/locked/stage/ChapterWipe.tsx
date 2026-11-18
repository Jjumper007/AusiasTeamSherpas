import type { Chapter } from '@sherpas/shared'
import type { FC } from 'react'
import { Easing, interpolate, useCurrentFrame } from 'remotion'
import { Wordmark } from '../brand/Brand'
import { WORDMARK_BOX } from '../brand/marks'
import type { FrameRange } from '../timing'
import { COLORS, FONT } from '../tokens'

/**
 * LOCKED. The chapter wipe of the base video (Video 4.0): at every scene change the curtain drops
 * to navy (DESIGN.md), led by a lavender and a blue band, carrying the chapter's number and title.
 */

/** The bands take this many frames to reach the middle of the frame, and as many to leave. */
const HALF_WIPE_FRAMES = 13
/** Each following band trails the one before by this many frames. */
const BAND_LAG_FRAMES = 3
const TRAVEL_PX = 2700
const SKEW_DEG = 14
/** The title shows for this many frames on each side of the middle. */
const TITLE_FRAMES = 8
const TITLE_MAX_WIDTH = 1600
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
/** Back to front: the navy band carries the title. */
const BANDS = [COLORS.lavender, COLORS.blueBright, COLORS.navyDeep] as const

const BAND_HEIGHT = 1280
const WORDMARK = { width: 170, bottom: 150 } as const
/**
 * The skewed band shifts anything below its middle sideways; this puts the wordmark back under
 * the centre of the frame.
 */
const WORDMARK_SKEW_SHIFT =
  Math.tan((SKEW_DEG * Math.PI) / 180) *
  (BAND_HEIGHT / 2 - WORDMARK.bottom - (WORDMARK.width * WORDMARK_BOX.height) / WORDMARK_BOX.width / 2)

const chapterNumber = (index: number): string => String(index).padStart(2, '0')

export const ChapterWipe: FC<{ readonly ranges: readonly FrameRange[]; readonly chapters: readonly Chapter[] }> = ({
  ranges,
  chapters,
}) => {
  const frame = useCurrentFrame()
  const lastBandLag = BAND_LAG_FRAMES * (BANDS.length - 1)
  const index = ranges.findIndex(
    (range, i) =>
      i > 0 && frame >= range.from - HALF_WIPE_FRAMES && frame <= range.from + HALF_WIPE_FRAMES + lastBandLag,
  )
  if (index <= 0) return null

  const middle = ranges[index].from
  const bandX = (lag: number): number => {
    const progress = interpolate(frame, [middle - HALF_WIPE_FRAMES + lag, middle + HALF_WIPE_FRAMES + lag], [0, 1], {
      ...clamp,
      easing: Easing.inOut(Easing.cubic),
    })
    return interpolate(progress, [0, 1], [-TRAVEL_PX, TRAVEL_PX])
  }
  const title = interpolate(frame, [middle - TITLE_FRAMES, middle, middle + TITLE_FRAMES], [0, 1, 0], clamp)

  return (
    <>
      {BANDS.map((color, band) => {
        const lag = BAND_LAG_FRAMES * (BANDS.length - 1 - band)
        const isFront = band === BANDS.length - 1
        return (
          <div
            key={color}
            style={{
              position: 'absolute',
              left: bandX(lag) - 400,
              top: -100,
              width: 2720,
              height: BAND_HEIGHT,
              transform: `skewX(-${SKEW_DEG}deg)`,
              background: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isFront ? (
              <>
                <div
                  style={{
                    transform: `skewX(${SKEW_DEG}deg)`,
                    display: 'flex',
                    gap: 30,
                    alignItems: 'baseline',
                    maxWidth: TITLE_MAX_WIDTH,
                    fontFamily: FONT.display,
                    fontWeight: 600,
                    letterSpacing: FONT.displayTracking,
                    fontSize: 104,
                    color: COLORS.white,
                    whiteSpace: 'nowrap',
                    opacity: title,
                    translate: `${(1 - title) * 60}px 0px`,
                  }}
                >
                  <span style={{ color: COLORS.sky }}>{chapterNumber(index)}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{chapters[index]?.title}</span>
                </div>
                <div
                  style={{
                    position: 'absolute',
                    bottom: WORDMARK.bottom,
                    translate: `${WORDMARK_SKEW_SHIFT}px 0px`,
                    transform: `skewX(${SKEW_DEG}deg)`,
                    opacity: title * 0.7,
                  }}
                >
                  <Wordmark width={WORDMARK.width} />
                </div>
              </>
            ) : null}
          </div>
        )
      })}
    </>
  )
}
