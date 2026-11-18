import type { FC } from 'react'
import { useCurrentFrame } from 'remotion'
import { Wordmark } from '../brand/Brand'
import { COLORS, OFFICE } from '../tokens'

/**
 * LOCKED. The office of the base video (Video 4.0): wall with a framed chart, a clock and the
 * Sherpas sign, a window over the city, a wooden floor and a plant.
 * Video 4.0's window looks onto mountains; this one keeps the city (no mountain metaphor).
 */

const WINDOW = { x: 50, y: 90, width: 500, height: 640 } as const
const BUILDING_COUNT = 9
const BUILDINGS = Array.from({ length: BUILDING_COUNT }, (_, index) => ({
  x: index * 64 - 10,
  width: 52 + ((index * 37) % 24),
  height: 180 + ((index * 97) % 220),
}))
const WINDOW_ROW_PX = 34
/** Lit windows change every this many frames. */
const LIGHTS_EVERY_FRAMES = 45
const CLOUD_SPEED = 0.35
const CLOUD_LOOP = 700
const FLOOR_Y = 900

const Wall: FC = () => (
  <>
    <div
      style={{
        position: 'absolute',
        left: -300,
        top: -200,
        width: 2520,
        height: 1100,
        background: `linear-gradient(180deg, ${OFFICE.wallTop} 0%, ${OFFICE.wallBottom} 100%)`,
      }}
    />
    {[300, 1230].map((x) => (
      <div
        key={x}
        style={{
          position: 'absolute',
          left: x - 400,
          top: -300,
          width: 800,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(closest-side, rgba(255,255,255,0.9), rgba(255,255,255,0))',
        }}
      />
    ))}
  </>
)

/** A framed line chart on the wall, going up. */
const WallChart: FC = () => (
  <div
    style={{
      position: 'absolute',
      left: 120,
      top: -10,
      width: 150,
      height: 84,
      borderRadius: 8,
      background: COLORS.white,
      boxShadow: '0 8px 16px rgba(30,40,70,0.15)',
      border: `6px solid ${COLORS.navySurface}`,
    }}
  >
    <svg width={138} height={72} viewBox="0 0 138 72">
      <polyline
        points="10,60 34,48 56,52 80,34 104,30 128,14"
        fill="none"
        stroke={COLORS.brandBlue}
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
)

/** A wall clock whose hands follow the video's clock. */
const Clock: FC = () => {
  const frame = useCurrentFrame()
  const hourAngle = Math.floor(frame / 30) * 0.5 + 60
  const minuteAngle = (frame / 30) * 6
  return (
    <svg width={90} height={90} viewBox="0 0 90 90" style={{ position: 'absolute', left: 345, top: -4 }}>
      <circle cx={45} cy={45} r={40} fill={COLORS.white} stroke={COLORS.navySurface} strokeWidth={6} />
      <line x1={45} y1={45} x2={45} y2={18} stroke={COLORS.navySurface} strokeWidth={4} strokeLinecap="round" transform={`rotate(${hourAngle} 45 45)`} />
      <line x1={45} y1={45} x2={45} y2={10} stroke={COLORS.brandBlue} strokeWidth={2.5} strokeLinecap="round" transform={`rotate(${minuteAngle} 45 45)`} />
      <circle cx={45} cy={45} r={4} fill={COLORS.navySurface} />
    </svg>
  )
}

/** The Sherpas sign on the wall, above the screen. */
const BrandSign: FC = () => (
  <div
    style={{
      position: 'absolute',
      left: 760,
      top: 14,
      padding: '10px 26px',
      borderRadius: 12,
      background: 'rgba(255,255,255,0.8)',
      boxShadow: '0 6px 14px rgba(30,40,70,0.12)',
    }}
  >
    <Wordmark width={190} color="#0E1C29" style={{ opacity: 0.8 }} />
  </div>
)

const CityWindow: FC = () => {
  const frame = useCurrentFrame()
  const cloudX = (frame * CLOUD_SPEED) % CLOUD_LOOP
  return (
    <div
      style={{
        position: 'absolute',
        left: WINDOW.x,
        top: WINDOW.y,
        width: WINDOW.width,
        height: WINDOW.height,
        borderRadius: 10,
        overflow: 'hidden',
        background: OFFICE.windowSky,
        boxShadow: 'inset 0 0 0 14px #FFFFFF, 0 10px 26px rgba(30,40,70,0.16)',
      }}
    >
      <div style={{ position: 'absolute', left: 350, top: 60, width: 90, height: 90, borderRadius: '50%', background: OFFICE.sun }} />
      {[0, 1].map((cloud) => (
        <div
          key={cloud}
          style={{
            position: 'absolute',
            left: cloudX - 260 + cloud * 420,
            top: 18 + cloud * 44,
            width: 140,
            height: 36,
            borderRadius: 30,
            background: 'rgba(255,255,255,0.85)',
          }}
        />
      ))}
      <svg width={WINDOW.width} height={WINDOW.height} style={{ position: 'absolute', left: 0, top: 0 }}>
        {BUILDINGS.map((building, index) => (
          <g key={index}>
            <rect
              x={building.x}
              y={WINDOW.height - building.height}
              width={building.width}
              height={building.height}
              fill={index % 2 ? OFFICE.buildingA : OFFICE.buildingB}
            />
            {Array.from({ length: Math.floor(building.height / WINDOW_ROW_PX) }, (_, row) =>
              [0, 1].map((column) => (
                <rect
                  key={`${row}-${column}`}
                  x={building.x + 10 + column * (building.width / 2 - 4)}
                  y={WINDOW.height - building.height + 14 + row * WINDOW_ROW_PX}
                  width={building.width / 2 - 16}
                  height={14}
                  fill={OFFICE.buildingWindow}
                  opacity={(index + row + column + Math.floor(frame / LIGHTS_EVERY_FRAMES)) % 4 === 0 ? 0.95 : 0.45}
                />
              )),
            )}
          </g>
        ))}
      </svg>
      <div style={{ position: 'absolute', left: 243, top: 0, width: 14, height: WINDOW.height, background: '#FFFFFF' }} />
      <div style={{ position: 'absolute', left: 0, top: 300, width: WINDOW.width, height: 12, background: '#FFFFFF' }} />
      <div
        style={{
          position: 'absolute',
          left: -40,
          top: -60,
          width: 300,
          height: 900,
          rotate: '24deg',
          background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.22), rgba(255,255,255,0))',
        }}
      />
    </div>
  )
}

const Floor: FC = () => (
  <>
    <div
      style={{
        position: 'absolute',
        left: -300,
        top: FLOOR_Y,
        width: 2520,
        height: 400,
        background: `linear-gradient(180deg, ${OFFICE.floorTop}, ${OFFICE.floorBottom})`,
      }}
    />
    <svg width={2520} height={400} style={{ position: 'absolute', left: -300, top: FLOOR_Y }}>
      {Array.from({ length: 22 }, (_, index) => (
        <line key={index} x1={index * 130} y1={0} x2={index * 130 - 120} y2={400} stroke={OFFICE.floorLine} strokeWidth={2} opacity={0.45} />
      ))}
    </svg>
    <div style={{ position: 'absolute', left: -300, top: FLOOR_Y - 8, width: 2520, height: 12, background: OFFICE.skirting }} />
  </>
)

const Plant: FC = () => {
  const frame = useCurrentFrame()
  return (
    <svg width={160} height={260} viewBox="0 0 160 260" style={{ position: 'absolute', left: 1780, top: 700 }}>
      {[-40, -18, 0, 20, 42].map((angle, index) => (
        <ellipse
          key={angle}
          cx={80}
          cy={90}
          rx={18}
          ry={70}
          fill={index % 2 ? OFFICE.leafA : OFFICE.leafB}
          transform={`rotate(${angle + Math.sin(frame / 40 + index) * 2.5} 80 160)`}
        />
      ))}
      <path d="M44 160 L116 160 L106 250 L54 250 Z" fill={OFFICE.pot} />
      <path d="M44 160 L116 160 L114 176 L46 176 Z" fill={OFFICE.potRim} />
    </svg>
  )
}

export const Office: FC = () => (
  <>
    <Wall />
    <WallChart />
    <Clock />
    <BrandSign />
    <CityWindow />
    <Floor />
    <Plant />
  </>
)
