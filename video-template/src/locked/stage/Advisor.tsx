import type { FC } from 'react'
import type { AdvisorExpr, AdvisorPose } from './speech'

/**
 * LOCKED. The presenter of the base video: a flat-style guide in a navy suit, white shirt and
 * burgundy tie. Fully driven by props (no timing of its own) so the parent can blend poses.
 */

type Point = readonly [number, number]
export interface ArmSet {
  readonly le: Point
  readonly lh: Point
  readonly re: Point
  readonly rh: Point
}

// Shoulders: left (108, 206), right (192, 206), in a 300×520 viewBox.
export const ADVISOR_POSES: Readonly<Record<AdvisorPose, ArmSet>> = {
  idle: { le: [92, 266], lh: [100, 324], re: [208, 266], rh: [200, 324] },
  point: { le: [92, 266], lh: [100, 324], re: [244, 214], rh: [298, 180] },
  present: { le: [92, 266], lh: [100, 324], re: [240, 254], rh: [288, 232] },
  explain: { le: [84, 264], lh: [126, 246], re: [216, 264], rh: [176, 246] },
  welcome: { le: [64, 242], lh: [36, 206], re: [236, 242], rh: [264, 206] },
  thumbsUp: { le: [92, 266], lh: [100, 324], re: [236, 252], rh: [244, 196] },
  think: { le: [96, 272], lh: [176, 266], re: [222, 244], rh: [168, 176] },
  count: { le: [92, 266], lh: [100, 324], re: [230, 230], rh: [236, 166] },
}

const COL = {
  skin: '#C98E67',
  skinShade: '#B57A55',
  hair: '#2A1E1A',
  hairLight: '#4A3830',
  suit: '#2B3A67',
  suitShade: '#22305A',
  trousers: '#1F2A4A',
  shirt: '#FFFFFF',
  tie: '#B23A48',
  tieShade: '#952E3B',
  shoe: '#3A2A22',
  ink: '#1C1A2E',
  mouth: '#5A2230',
} as const

const VIEW = { width: 300, height: 520 } as const
const SHOULDER_LEFT: Point = [108, 206]
const SHOULDER_RIGHT: Point = [192, 206]
/** The shirt cuff sits this far along the forearm. */
const CUFF_SHARE = 0.8

const EXPRESSIONS: Readonly<Record<AdvisorExpr, { readonly brows: readonly [Point, Point, Point, Point]; readonly smile: number }>> = {
  happy: { brows: [[118, 86], [138, 82], [162, 82], [182, 86]], smile: 1 },
  neutral: { brows: [[118, 88], [138, 86], [162, 86], [182, 88]], smile: 0.45 },
  concerned: { brows: [[118, 88], [138, 82], [162, 82], [182, 88]], smile: -0.15 },
}

export interface AdvisorProps {
  readonly arms: ArmSet
  readonly handStyle: AdvisorPose
  readonly expr: AdvisorExpr
  /** 0 closed … 1 wide open. */
  readonly mouth: number
  readonly blink: boolean
  /** Vertical breathing offset in px. */
  readonly breath: number
  readonly headTilt: number
  readonly lean: number
  /** Pupil offset along x. */
  readonly look: number
  readonly width: number
}

const Sleeve: FC<{ readonly shoulder: Point; readonly elbow: Point; readonly hand: Point }> = ({ shoulder, elbow, hand }) => {
  const cuff: Point = [elbow[0] + (hand[0] - elbow[0]) * CUFF_SHARE, elbow[1] + (hand[1] - elbow[1]) * CUFF_SHARE]
  return (
    <g>
      <polyline
        points={`${shoulder[0]},${shoulder[1]} ${elbow[0]},${elbow[1]} ${cuff[0]},${cuff[1]}`}
        fill="none"
        stroke={COL.suit}
        strokeWidth={32}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={cuff[0]} cy={cuff[1]} r={13} fill={COL.shirt} />
    </g>
  )
}

const Hand: FC<{ readonly at: Point; readonly style: AdvisorPose; readonly right: boolean }> = ({ at: [x, y], style, right }) => {
  if (right && style === 'thumbsUp') {
    return (
      <g>
        <rect x={x - 15} y={y - 2} width={30} height={28} rx={11} fill={COL.skin} />
        <rect x={x - 3} y={y - 26} width={12} height={30} rx={6} fill={COL.skin} />
      </g>
    )
  }
  if (right && (style === 'count' || style === 'point')) {
    return (
      <g>
        <circle cx={x} cy={y} r={14} fill={COL.skin} />
        {style === 'count' ? (
          <rect x={x - 5} y={y - 34} width={10} height={30} rx={5} fill={COL.skin} />
        ) : (
          <rect x={x + 4} y={y - 14} width={28} height={10} rx={5} fill={COL.skin} transform={`rotate(-32 ${x} ${y})`} />
        )}
      </g>
    )
  }
  const open = style === 'present' || style === 'welcome' || style === 'explain'
  return open ? <ellipse cx={x} cy={y} rx={15} ry={17} fill={COL.skin} /> : <circle cx={x} cy={y} r={14} fill={COL.skin} />
}

const smilePath = (smile: number): string => {
  const centre = 150
  const y = 146
  return `M${centre - 15} ${y} Q${centre} ${y + smile * 10} ${centre + 15} ${y}`
}

export const Advisor: FC<AdvisorProps> = ({ arms, handStyle, expr, mouth, blink, breath, headTilt, lean, look, width }) => {
  const { brows, smile } = EXPRESSIONS[expr]
  return (
    <svg
      width={width}
      height={(width * VIEW.height) / VIEW.width}
      viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
      style={{ overflow: 'visible' }}
    >
      <ellipse cx={150} cy={508} rx={86} ry={11} fill="rgba(20,20,40,0.22)" />
      <g transform={`rotate(${lean} 150 505)`}>
        <path d="M112 318 L148 318 L146 494 L116 494 Z" fill={COL.trousers} />
        <path d="M152 318 L188 318 L184 494 L154 494 Z" fill={COL.trousers} />
        <ellipse cx={126} cy={498} rx={27} ry={11} fill={COL.shoe} />
        <ellipse cx={176} cy={498} rx={27} ry={11} fill={COL.shoe} />

        <g transform={`translate(0 ${breath})`}>
          <path d="M96 198 Q150 182 204 198 L214 332 Q150 344 86 332 Z" fill={COL.suit} />
          <path d="M131 192 L150 252 L169 192 Z" fill={COL.shirt} />
          <path d="M145 198 L155 198 L158 210 L142 210 Z" fill={COL.tieShade} />
          <path d="M142 210 L158 210 L162 262 L150 276 L138 262 Z" fill={COL.tie} />
          <path d="M131 192 L150 254 L140 266 L116 200 Z" fill={COL.suitShade} />
          <path d="M169 192 L150 254 L160 266 L184 200 Z" fill={COL.suitShade} />
          <path d="M112 236 L130 236 L126 244 L114 244 Z" fill={COL.shirt} />
          <circle cx={150} cy={292} r={4} fill={COL.ink} opacity={0.5} />
          <circle cx={150} cy={314} r={4} fill={COL.ink} opacity={0.5} />

          <Sleeve shoulder={SHOULDER_LEFT} elbow={arms.le} hand={arms.lh} />
          <Sleeve shoulder={SHOULDER_RIGHT} elbow={arms.re} hand={arms.rh} />
          <Hand at={arms.lh} style={handStyle} right={false} />
          <Hand at={arms.rh} style={handStyle} right />

          <rect x={139} y={156} width={22} height={38} rx={6} fill={COL.skinShade} />
          <g transform={`rotate(${headTilt} 150 170)`}>
            <ellipse cx={90} cy={116} rx={9} ry={13} fill={COL.skinShade} />
            <ellipse cx={210} cy={116} rx={9} ry={13} fill={COL.skinShade} />
            <ellipse cx={150} cy={110} rx={60} ry={64} fill={COL.skin} />
            <path d="M88 104 Q82 40 150 36 Q216 38 212 100 Q204 70 172 62 Q140 58 118 74 Q100 84 88 104 Z" fill={COL.hair} />
            <path d="M118 74 Q140 52 176 58" fill="none" stroke={COL.hairLight} strokeWidth={4} strokeLinecap="round" />
            <polyline points={`${brows[0].join(',')} ${brows[1].join(',')}`} stroke={COL.hair} strokeWidth={6} strokeLinecap="round" fill="none" />
            <polyline points={`${brows[2].join(',')} ${brows[3].join(',')}`} stroke={COL.hair} strokeWidth={6} strokeLinecap="round" fill="none" />
            <ellipse cx={128 + look} cy={106} rx={5.5} ry={blink ? 1 : 6.5} fill={COL.ink} />
            <ellipse cx={172 + look} cy={106} rx={5.5} ry={blink ? 1 : 6.5} fill={COL.ink} />
            <path d="M150 112 Q156 126 148 128" fill="none" stroke={COL.skinShade} strokeWidth={4} strokeLinecap="round" />
            {mouth > 0.08 ? (
              <g>
                <path d={`M136 144 Q150 ${150 + mouth * 16} 164 144 Z`} fill={COL.mouth} />
                <path d="M138 144 L162 144" stroke={COL.shirt} strokeWidth={3} opacity={0.9} />
              </g>
            ) : (
              <path d={smilePath(smile)} fill="none" stroke={COL.mouth} strokeWidth={4.5} strokeLinecap="round" />
            )}
          </g>
        </g>
      </g>
    </svg>
  )
}
