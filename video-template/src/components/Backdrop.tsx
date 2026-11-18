import type { FC } from 'react'
import { AbsoluteFill } from 'remotion'
import { COLORS, VIDEO } from '../locked/tokens'
import { SUMMIT, trailPath } from './trail'

const SUN = { x: 520, lowY: 760, highY: 420, radius: 110, glowRadius: 190 }
const FLAG = { poleHeight: 80, width: 54, height: 34 }

interface BackdropProps {
  /** 0 = sun on the horizon, 1 = sun fully up. */
  readonly sunProgress?: number
}

/** The shared landscape: dawn sky, the mountain with its trail, and the summit flag (retirement). */
export const Backdrop: FC<BackdropProps> = ({ sunProgress = 1 }) => {
  const sunY = SUN.lowY + (SUN.highY - SUN.lowY) * sunProgress

  return (
    <AbsoluteFill>
      <svg viewBox={`0 0 ${VIDEO.width} ${VIDEO.height}`} width={VIDEO.width} height={VIDEO.height}>
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={COLORS.skyTop} />
            <stop offset="1" stopColor={COLORS.skyBottom} />
          </linearGradient>
        </defs>
        <rect width={VIDEO.width} height={VIDEO.height} fill="url(#sky)" />
        <circle cx={SUN.x} cy={sunY} r={SUN.glowRadius} fill={COLORS.sunGlow} opacity={0.6} />
        <circle cx={SUN.x} cy={sunY} r={SUN.radius} fill={COLORS.sun} />
        <polygon
          points="0,1080 0,760 260,560 520,760 760,520 1040,800 1500,470 1920,720 1920,1080"
          fill={COLORS.farRange}
        />
        <polygon points="640,1080 1340,220 1980,1080" fill={COLORS.mountain} />
        <polygon points="1340,220 1980,1080 1500,1080 1400,640" fill={COLORS.mountainShade} />
        <polygon points="1340,220 1268,300 1320,330 1350,300 1392,340 1404,300" fill={COLORS.snow} />
        <path
          d="M 0 1080 L 0 900 Q 380 820 820 930 T 1920 900 L 1920 1080 Z"
          fill={COLORS.sage}
        />
        <path
          d="M 0 1080 L 0 1000 Q 600 940 1100 1010 T 1920 990 L 1920 1080 Z"
          fill={COLORS.sageDark}
        />
        <path
          d={trailPath()}
          fill="none"
          stroke={COLORS.trail}
          strokeWidth={10}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="4 22"
        />
        <line
          x1={SUMMIT.x}
          y1={SUMMIT.y}
          x2={SUMMIT.x}
          y2={SUMMIT.y - FLAG.poleHeight}
          stroke={COLORS.ink}
          strokeWidth={6}
          strokeLinecap="round"
        />
        <polygon
          points={`${SUMMIT.x},${SUMMIT.y - FLAG.poleHeight} ${SUMMIT.x + FLAG.width},${SUMMIT.y - FLAG.poleHeight + FLAG.height / 2} ${SUMMIT.x},${SUMMIT.y - FLAG.poleHeight + FLAG.height}`}
          fill={COLORS.accent}
        />
      </svg>
    </AbsoluteFill>
  )
}
