import { Check } from 'lucide-react'
import type { FC } from 'react'
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import type { Burst } from '../../scenes/bursts'
import { burstStartFrame, type FrameRange } from '../timing'
import { COLORS, FONT, RADIUS } from '../tokens'
import { ImpactRing } from './ImpactRing'

/**
 * LOCKED. The callouts of the base video (Video 4.0): a tilted pill pops in at the top right and
 * fades out. Good news gets a check and an impact ring; bad news shakes. Status colours only where
 * they carry meaning (DESIGN.md).
 */

const BURST_SEC = 1.9
const POP_FRAMES = 10
const FADE_FRAMES = 8
const SHAKE_FRAMES = 14
const SHAKE_PX = 9
const POSITION = { right: 70, top: 100 } as const
/** Where the ring of a good-news callout bursts, in frame coordinates. */
const RING = { x: 1920 - 70 - 250, y: 170 } as const
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
/** Gold and amber fills keep navy text (DESIGN.md score bands); the others take white. */
const DARK_TEXT_ON: ReadonlySet<string> = new Set([COLORS.stableGold, COLORS.warning])

const Callout: FC<{ readonly burst: Burst; readonly startFrame: number }> = ({ burst, startFrame }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const endFrame = startFrame + Math.round(BURST_SEC * fps)
  if (frame < startFrame || frame > endFrame) return null

  const pop = interpolate(frame - startFrame, [0, POP_FRAMES], [0, 1], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) })
  const fade = interpolate(frame, [endFrame - FADE_FRAMES, endFrame], [1, 0], clamp)
  const since = frame - startFrame
  const shake = !burst.good && since < SHAKE_FRAMES ? Math.sin(since * 2.6) * SHAKE_PX * (1 - since / SHAKE_FRAMES) : 0
  const textColor = DARK_TEXT_ON.has(burst.color) ? COLORS.navyDeep : COLORS.white
  return (
    <>
      <div
        style={{
          position: 'absolute',
          right: POSITION.right,
          top: POSITION.top,
          translate: `${shake}px 0px`,
          rotate: `${interpolate(pop, [0, 1], [-14, -4])}deg`,
          scale: String(interpolate(pop, [0, 1], [0.2, 1]) * (0.6 + 0.4 * fade)),
          opacity: fade,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '18px 40px',
            borderRadius: RADIUS.pill,
            background: burst.color,
            color: textColor,
            fontFamily: FONT.display,
            fontWeight: 600,
            letterSpacing: FONT.displayTracking,
            fontSize: 62,
            boxShadow: `0 20px 44px ${burst.color}66`,
            whiteSpace: 'nowrap',
          }}
        >
          {burst.good ? <Check size={60} strokeWidth={2.75} color={textColor} /> : null}
          {burst.text}
        </div>
      </div>
      {burst.good ? <ImpactRing startFrame={startFrame + 2} x={RING.x} y={RING.y} count={20} power={260} /> : null}
    </>
  )
}

export const Bursts: FC<{ readonly bursts: readonly Burst[]; readonly ranges: readonly FrameRange[] }> = ({ bursts, ranges }) => (
  <>
    {bursts.map((burst) => {
      const range = ranges[burst.sceneIndex]
      if (!range) return null
      return <Callout key={`${burst.sceneIndex}-${burst.text}`} burst={burst} startFrame={burstStartFrame(burst, range)} />
    })}
  </>
)
