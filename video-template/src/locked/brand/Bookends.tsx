import type { FC } from 'react'
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion'
import { BRAND } from '../timing'
import { COLORS, FONT } from '../tokens'
import { BrandLockup, NavyBackdrop } from './Brand'

/**
 * LOCKED. The brand opening and closing of the base video (Video 4.0). The opening shows the logo
 * on navy and opens an iris onto the first scene; the closing irises from the last scene onto the
 * logo, which stays to the last frame (no fade-out).
 */

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
const IRIS_EASING = Easing.bezier(0.7, 0, 0.3, 1)
/** The iris grows from a point to past the corners of the frame. */
const IRIS_RADIUS = [-60, 1560] as const
/** Width of the soft edge of the iris. */
const IRIS_FEATHER = 60
const CENTER = { x: 960, y: 540 } as const
const LOGO_START_FRAME = 6
/** The lockup fades out over the first frames of the opening iris. */
const LOGO_FADE_FRAMES = 14
/** The closing logo starts rising just before its iris is complete. */
const CLOSING_LOGO_LEAD = 4
/** "Inspired" by Kevin MacLeod is licensed CC BY 4.0, which asks for this credit. */
const MUSIC_CREDIT = 'Music: "Inspired" by Kevin MacLeod (incompetech.com), licensed under CC BY 4.0'
const CREDIT_FROM_FRAME = 40

const IrisRing: FC<{ readonly radius: number; readonly opacity: number }> = ({ radius, opacity }) => (
  <div
    style={{
      position: 'absolute',
      left: CENTER.x - radius,
      top: CENTER.y - radius,
      width: radius * 2,
      height: radius * 2,
      borderRadius: '50%',
      border: `5px solid ${COLORS.sky}`,
      opacity,
      boxSizing: 'border-box',
    }}
  />
)

export const Opening: FC = () => {
  const frame = useCurrentFrame()
  const irisOpen = frame >= BRAND.irisOpenFrame
  const radius = interpolate(frame, [BRAND.irisOpenFrame, BRAND.introFrames], [...IRIS_RADIUS], { ...clamp, easing: IRIS_EASING })
  const pushIn = interpolate(frame, [0, BRAND.introFrames], [1, 1.1], clamp)
  const logo = interpolate(frame, [BRAND.irisOpenFrame, BRAND.irisOpenFrame + LOGO_FADE_FRAMES], [1, 0], clamp)
  const mask = irisOpen ? `radial-gradient(circle at 50% 50%, transparent ${radius}px, #000 ${radius + IRIS_FEATHER}px)` : undefined
  return (
    <AbsoluteFill style={{ WebkitMaskImage: mask, maskImage: mask }}>
      <NavyBackdrop />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', scale: String(pushIn), opacity: logo }}>
        <BrandLockup startFrame={LOGO_START_FRAME} />
      </AbsoluteFill>
      {irisOpen ? (
        <IrisRing
          radius={Math.max(0, radius + 30)}
          opacity={interpolate(frame, [BRAND.irisOpenFrame, BRAND.introFrames], [0.9, 0], clamp)}
        />
      ) : null}
    </AbsoluteFill>
  )
}

export const Closing: FC = () => {
  const frame = useCurrentFrame()
  const radius = interpolate(frame, [0, BRAND.outroOverlapFrames], [...IRIS_RADIUS], { ...clamp, easing: IRIS_EASING })
  const closed = frame >= BRAND.outroOverlapFrames
  const mask = closed ? undefined : `radial-gradient(circle at 50% 50%, #000 ${radius}px, transparent ${radius + IRIS_FEATHER}px)`
  return (
    <AbsoluteFill style={{ WebkitMaskImage: mask, maskImage: mask }}>
      <NavyBackdrop />
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          scale: String(interpolate(frame, [0, BRAND.outroFrames], [1.08, 1], clamp)),
        }}
      >
        <BrandLockup startFrame={BRAND.outroOverlapFrames - CLOSING_LOGO_LEAD} />
      </AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 40,
          textAlign: 'center',
          fontFamily: FONT.body,
          fontSize: 20,
          color: COLORS.navyMuted,
          opacity: interpolate(frame, [CREDIT_FROM_FRAME, CREDIT_FROM_FRAME + 15], [0, 1], clamp),
        }}
      >
        {MUSIC_CREDIT}
      </div>
      {closed ? null : <IrisRing radius={Math.max(0, radius)} opacity={0.85} />}
    </AbsoluteFill>
  )
}
