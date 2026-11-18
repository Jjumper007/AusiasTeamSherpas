import type { FC } from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import type { Burst } from '../../scenes/bursts'
import type { FrameRange } from '../timing'
import { COLORS, FONT } from '../tokens'

/** LOCKED. The stamps of the base video: a tilted label pops in at the top right and fades out. */

const BURST_SEC = 1.9
const FADE_FRAMES = 8
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

const Stamp: FC<{ readonly burst: Burst; readonly startFrame: number }> = ({ burst, startFrame }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const endFrame = startFrame + Math.round(BURST_SEC * fps)
  if (frame < startFrame || frame > endFrame) return null

  const pop = spring({ frame: frame - startFrame, fps, config: { damping: 9, stiffness: 220 } })
  const fade = interpolate(frame, [endFrame - FADE_FRAMES, endFrame], [1, 0], clamp)
  return (
    <div
      style={{
        position: 'absolute',
        right: 70,
        top: 100,
        rotate: `${interpolate(pop, [0, 1], [-18, -5])}deg`,
        scale: String(interpolate(pop, [0, 1], [0.2, 1]) * (0.6 + 0.4 * fade)),
        opacity: fade,
      }}
    >
      <div
        style={{
          padding: '18px 40px',
          borderRadius: 20,
          background: burst.color,
          color: COLORS.navyDeep,
          fontFamily: FONT.display,
          fontWeight: 600,
          letterSpacing: FONT.displayTracking,
          fontSize: 64,
          boxShadow: '0 18px 40px rgba(20,20,40,0.35)',
          border: `6px solid ${COLORS.white}`,
          whiteSpace: 'nowrap',
        }}
      >
        {burst.text}
      </div>
    </div>
  )
}

export const Bursts: FC<{ readonly bursts: readonly Burst[]; readonly ranges: readonly FrameRange[] }> = ({ bursts, ranges }) => (
  <>
    {bursts.map((burst) => {
      const range = ranges[burst.sceneIndex]
      if (!range) return null
      const startFrame = range.from + Math.round(range.durationInFrames * burst.atShare)
      return <Stamp key={`${burst.sceneIndex}-${burst.text}`} burst={burst} startFrame={startFrame} />
    })}
  </>
)
