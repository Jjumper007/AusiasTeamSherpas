import type { FC } from 'react'
import type { AdvisorExpr, AdvisorPose } from './speech'

/**
 * LOCKED. The presenter of the base video (Video 4.0, polished from 2.0/3.0): a flat-style guide
 * in a navy suit with layered shading, fabric folds, collar, ear and iris detail and a rim light.
 * Fully driven by props (no timing of its own) so the parent can blend poses smoothly.
 */

type Pt = readonly [number, number]
export interface ArmSet {
  readonly le: Pt
  readonly lh: Pt
  readonly re: Pt
  readonly rh: Pt
}

// Shoulders: L (108, 206), R (192, 206). viewBox 0 0 300 520.
export const ADVISOR_POSES: Readonly<Record<AdvisorPose, ArmSet>> = {
  idle: { le: [92, 266], lh: [100, 324], re: [208, 266], rh: [200, 324] },
  point: { le: [92, 266], lh: [100, 324], re: [244, 214], rh: [298, 180] },
  present: { le: [92, 266], lh: [100, 324], re: [240, 254], rh: [288, 232] },
  explain: { le: [84, 264], lh: [126, 246], re: [216, 264], rh: [176, 246] },
  welcome: { le: [64, 242], lh: [36, 206], re: [236, 242], rh: [264, 206] },
  thumbsUp: { le: [92, 266], lh: [100, 324], re: [236, 252], rh: [244, 196] },
  think: { le: [96, 272], lh: [176, 266], re: [222, 244], rh: [168, 176] },
  count: { le: [92, 266], lh: [100, 324], re: [230, 230], rh: [236, 166] },
};

const COL = {
  skin: "#C98E67",
  skinLight: "#DBA47D",
  skinShade: "#B57A55",
  hair: "#2A1E1A",
  suit: "#2B3A67",
  suitLight: "#3A4C84",
  suitShade: "#1E2B52",
  trousers: "#1F2A4A",
  shirt: "#FFFFFF",
  tie: "#4565D6",
  tieShade: "#1C45D7",
  shoe: "#3A2A22",
  ink: "#1C1A2E",
};

const EXPR: Readonly<Record<AdvisorExpr, { readonly brows: readonly [Pt, Pt, Pt, Pt]; readonly smile: number }>> = {
  happy: { brows: [[118, 86], [138, 80], [162, 80], [182, 86]], smile: 1 },
  neutral: { brows: [[118, 88], [138, 86], [162, 86], [182, 88]], smile: 0.45 },
  concerned: { brows: [[118, 90], [138, 82], [162, 82], [182, 90]], smile: -0.15 },
};

export interface AdvisorProps {
  readonly arms: ArmSet
  readonly handStyle: AdvisorPose
  readonly expr: AdvisorExpr
  /** 0 closed … 1 wide open. */
  readonly mouth: number
  readonly blink: boolean
  /** Chest rise, in px. */
  readonly breath: number
  /** Degrees. */
  readonly headTilt: number
  /** Degrees. */
  readonly lean: number
  /** Pupil x offset. */
  readonly look: number
  readonly width: number
}

export const Advisor: FC<AdvisorProps> = ({ arms, handStyle, expr, mouth, blink, breath, headTilt, lean, look, width }) => {
  const e = EXPR[expr];
  const sleeve = (sh: Pt, el: Pt, h: Pt, key: string) => {
    const cuff: Pt = [el[0] + (h[0] - el[0]) * 0.8, el[1] + (h[1] - el[1]) * 0.8];
    return (
      <g key={key}>
        <polyline points={`${sh[0]},${sh[1]} ${el[0]},${el[1]} ${cuff[0]},${cuff[1]}`} fill="none" stroke={COL.suitShade} strokeWidth={34} strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={`${sh[0]},${sh[1]} ${el[0]},${el[1]} ${cuff[0]},${cuff[1]}`} fill="none" stroke="url(#suitG)" strokeWidth={30} strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={`${sh[0]},${sh[1]} ${el[0]},${el[1]} ${cuff[0]},${cuff[1]}`} fill="none" stroke="#8FA6FF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.28} transform="translate(-9 -3)" />
        <circle cx={cuff[0]} cy={cuff[1]} r={13} fill={COL.shirt} />
        <circle cx={cuff[0]} cy={cuff[1]} r={13} fill="none" stroke="#DDE3F0" strokeWidth={2} />
      </g>
    );
  };
  const hand = (h: Pt, style: AdvisorPose, right: boolean) => {
    if (right && style === "thumbsUp") {
      return (
        <g>
          <rect x={h[0] - 15} y={h[1] - 2} width={30} height={28} rx={11} fill="url(#skinG)" />
          <rect x={h[0] - 3} y={h[1] - 26} width={12} height={30} rx={6} fill="url(#skinG)" />
        </g>
      );
    }
    if (right && (style === "count" || style === "point")) {
      const up = style === "count";
      return (
        <g>
          <circle cx={h[0]} cy={h[1]} r={14} fill="url(#skinG)" />
          {up ? (
            <rect x={h[0] - 5} y={h[1] - 34} width={10} height={30} rx={5} fill="url(#skinG)" />
          ) : (
            <rect x={h[0] + 4} y={h[1] - 14} width={28} height={10} rx={5} fill="url(#skinG)" transform={`rotate(-32 ${h[0]} ${h[1]})`} />
          )}
        </g>
      );
    }
    const open = style === "present" || style === "welcome" || style === "explain";
    return open ? (
      <g>
        <ellipse cx={h[0]} cy={h[1]} rx={15} ry={17} fill="url(#skinG)" />
        <path d={`M${h[0] - 5} ${h[1] - 1} L${h[0] - 5} ${h[1] + 13} M${h[0] + 2} ${h[1] - 1} L${h[0] + 2} ${h[1] + 14} M${h[0] + 9} ${h[1] - 1} L${h[0] + 9} ${h[1] + 11}`} stroke={COL.skinShade} strokeWidth={1.5} strokeLinecap="round" opacity={0.7} />
      </g>
    ) : (
      <g>
        <circle cx={h[0]} cy={h[1]} r={14} fill="url(#skinG)" />
        <path d={`M${h[0] - 4} ${h[1] + 3} L${h[0] - 4} ${h[1] + 11} M${h[0] + 3} ${h[1] + 3} L${h[0] + 3} ${h[1] + 12}`} stroke={COL.skinShade} strokeWidth={1.5} strokeLinecap="round" opacity={0.6} />
      </g>
    );
  };
  const smilePath = (() => {
    const c = 150;
    const y = 146;
    const k = e.smile * 10;
    return `M${c - 15} ${y} Q${c} ${y + k} ${c + 15} ${y}`;
  })();

  return (
    <svg width={width} height={(width * 520) / 300} viewBox="0 0 300 520" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="suitG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={COL.suitLight} />
          <stop offset="1" stopColor={COL.suit} />
        </linearGradient>
        <linearGradient id="skinG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={COL.skinLight} />
          <stop offset="1" stopColor={COL.skin} />
        </linearGradient>
        <radialGradient id="faceG" cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stopColor={COL.skinLight} />
          <stop offset="1" stopColor={COL.skin} />
        </radialGradient>
        <linearGradient id="torsoG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={COL.suitLight} />
          <stop offset="1" stopColor={COL.suitShade} />
        </linearGradient>
        <linearGradient id="jawG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.55" stopColor={COL.skinShade} stopOpacity={0} />
          <stop offset="1" stopColor={COL.skinShade} stopOpacity={0.55} />
        </linearGradient>
        <linearGradient id="rimG" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0.7" stopColor="#8FA6FF" stopOpacity={0} />
          <stop offset="1" stopColor="#8FA6FF" stopOpacity={0.45} />
        </linearGradient>
      </defs>
      <ellipse cx={150} cy={508} rx={96} ry={12} fill="rgba(20,20,40,0.26)" />
      <g transform={`rotate(${lean} 150 505)`}>
        {/* legs */}
        <path d="M112 318 L148 318 L146 494 L116 494 Z" fill={COL.trousers} />
        <path d="M152 318 L188 318 L184 494 L154 494 Z" fill={COL.trousers} />
        <path d="M152 318 L188 318 L184 494 L172 494 Z" fill="#17203B" opacity={0.5} />
        <path d="M130 330 L132 490" stroke="#2C3A63" strokeWidth={2} opacity={0.55} fill="none" />
        <path d="M170 330 L168 490" stroke="#2C3A63" strokeWidth={2} opacity={0.55} fill="none" />
        <path d="M113 470 Q130 478 147 470" stroke="#17203B" strokeWidth={3} opacity={0.5} fill="none" />
        <path d="M155 470 Q172 478 187 470" stroke="#17203B" strokeWidth={3} opacity={0.5} fill="none" />
        <ellipse cx={126} cy={498} rx={27} ry={11} fill={COL.shoe} />
        <ellipse cx={176} cy={498} rx={27} ry={11} fill={COL.shoe} />
        <ellipse cx={120} cy={495} rx={12} ry={3.5} fill="#6B4E40" opacity={0.7} />
        <ellipse cx={170} cy={495} rx={12} ry={3.5} fill="#6B4E40" opacity={0.7} />

        <g transform={`translate(0 ${breath})`}>
          {/* torso */}
          <path d="M96 198 Q150 182 204 198 L214 332 Q150 344 86 332 Z" fill="url(#torsoG)" />
          <path d="M96 198 Q150 182 204 198 L214 332 Q150 344 86 332 Z" fill="url(#rimG)" />
          <path d="M104 214 Q96 270 92 326" fill="none" stroke="#4C60A0" strokeWidth={2} opacity={0.35} />
          <path d="M120 300 Q150 312 180 300" fill="none" stroke={COL.suitShade} strokeWidth={3} opacity={0.5} />
          <path d="M131 192 L150 252 L169 192 Z" fill={COL.shirt} />
          <path d="M131 192 L150 252 L169 192" fill="none" stroke="#DDE3F0" strokeWidth={2} />
          <path d="M145 198 L155 198 L158 210 L142 210 Z" fill={COL.tieShade} />
          <path d="M142 210 L158 210 L162 262 L150 276 L138 262 Z" fill={COL.tie} />
          <path d="M150 210 L158 210 L162 262 L150 276 Z" fill={COL.tieShade} opacity={0.5} />
          <path d="M131 192 L150 254 L140 266 L116 200 Z" fill={COL.suitShade} />
          <path d="M169 192 L150 254 L160 266 L184 200 Z" fill={COL.suitShade} />
          <path d="M128 194 L148 250" stroke="#4C60A0" strokeWidth={2} opacity={0.7} fill="none" />
          <path d="M112 236 L130 236 L126 244 L114 244 Z" fill={COL.shirt} />
          <path d="M114 236 L122 240 L128 236" fill="none" stroke="#C9D2E8" strokeWidth={1.5} />
          <path d="M104 222 L150 214" stroke="#FFFFFF" strokeWidth={2} opacity={0.12} />
          <circle cx={150} cy={292} r={4} fill={COL.ink} opacity={0.5} />
          <circle cx={150} cy={314} r={4} fill={COL.ink} opacity={0.5} />

          {/* arms */}
          {sleeve([108, 206], arms.le, arms.lh, "l")}
          {sleeve([192, 206], arms.re, arms.rh, "r")}
          {hand(arms.lh, handStyle, false)}
          {hand(arms.rh, handStyle, true)}

          {/* neck + head */}
          <rect x={139} y={156} width={22} height={38} rx={6} fill={COL.skinShade} />
          <path d="M136 192 Q150 206 164 192 L168 186 Q150 200 132 186 Z" fill={COL.shirt} />
          <path d="M139 172 Q150 186 161 172 L161 186 L139 186 Z" fill="#9C6446" opacity={0.55} />
          <g transform={`rotate(${headTilt} 150 170)`}>
            <ellipse cx={90} cy={116} rx={9} ry={13} fill={COL.skinShade} />
            <ellipse cx={210} cy={116} rx={9} ry={13} fill={COL.skinShade} />
            <path d="M86 114 Q90 120 92 122" fill="none" stroke="#9C6446" strokeWidth={2.5} strokeLinecap="round" />
            <path d="M214 114 Q210 120 208 122" fill="none" stroke="#9C6446" strokeWidth={2.5} strokeLinecap="round" />
            <ellipse cx={150} cy={110} rx={60} ry={64} fill="url(#faceG)" />
            <ellipse cx={150} cy={110} rx={60} ry={64} fill="url(#jawG)" />
            <path d="M88 104 Q82 40 150 36 Q216 38 212 100 Q204 70 172 62 Q140 58 118 74 Q100 84 88 104 Z" fill={COL.hair} />
            <path d="M118 74 Q140 52 176 58" fill="none" stroke="#5A463C" strokeWidth={4} strokeLinecap="round" />
            <path d="M132 62 Q152 50 186 60" fill="none" stroke="#6E574B" strokeWidth={2.5} strokeLinecap="round" opacity={0.7} />
            <path d="M90 100 Q92 84 100 76" fill="none" stroke="#1B1310" strokeWidth={6} strokeLinecap="round" opacity={0.8} />
            <path d="M210 100 Q208 84 200 76" fill="none" stroke="#1B1310" strokeWidth={6} strokeLinecap="round" opacity={0.8} />
            {/* cheeks */}
            <ellipse cx={112} cy={130} rx={11} ry={7} fill="#E0806E" opacity={e.smile > 0.3 ? 0.33 : 0.12} />
            <ellipse cx={188} cy={130} rx={11} ry={7} fill="#E0806E" opacity={e.smile > 0.3 ? 0.33 : 0.12} />
            {/* brows */}
            <polyline points={`${e.brows[0].join(",")} ${e.brows[1].join(",")}`} stroke={COL.hair} strokeWidth={6} strokeLinecap="round" fill="none" />
            <polyline points={`${e.brows[2].join(",")} ${e.brows[3].join(",")}`} stroke={COL.hair} strokeWidth={6} strokeLinecap="round" fill="none" />
            {/* eyes */}
            <ellipse cx={128} cy={106} rx={9} ry={blink ? 1 : 9.5} fill="#fff" />
            <ellipse cx={172} cy={106} rx={9} ry={blink ? 1 : 9.5} fill="#fff" />
            <ellipse cx={128 + look} cy={106} rx={5.5} ry={blink ? 1 : 6.5} fill={COL.ink} />
            <ellipse cx={172 + look} cy={106} rx={5.5} ry={blink ? 1 : 6.5} fill={COL.ink} />
            {blink ? null : (
              <>
                <circle cx={130 + look} cy={103} r={2} fill="#fff" />
                <circle cx={174 + look} cy={103} r={2} fill="#fff" />
              </>
            )}
            {blink ? null : (
              <>
                <path d="M118 100 Q128 94 138 100" fill="none" stroke="#5A3F32" strokeWidth={2.5} strokeLinecap="round" opacity={0.6} />
                <path d="M162 100 Q172 94 182 100" fill="none" stroke="#5A3F32" strokeWidth={2.5} strokeLinecap="round" opacity={0.6} />
                <circle cx={128 + look} cy={106} r={5.8} fill="none" stroke="#3B2C28" strokeWidth={1} opacity={0.5} />
                <circle cx={172 + look} cy={106} r={5.8} fill="none" stroke="#3B2C28" strokeWidth={1} opacity={0.5} />
              </>
            )}
            {/* nose */}
            <path d="M150 112 Q156 126 148 128" fill="none" stroke={COL.skinShade} strokeWidth={4} strokeLinecap="round" />
            {/* mouth */}
            {mouth > 0.08 ? (
              <g>
                <path d={`M136 144 Q150 ${146 + 4 + mouth * 16} 164 144 Z`} fill="#5A2230" />
                <path d="M138 144 L162 144" stroke="#FFFFFF" strokeWidth={3} opacity={0.9} />
                <ellipse cx={150} cy={146 + 4 + mouth * 9} rx={7} ry={mouth * 3.2} fill="#C85A6B" />
              </g>
            ) : (
              <path d={smilePath} fill="none" stroke="#5A2230" strokeWidth={4.5} strokeLinecap="round" />
            )}
          </g>
        </g>
      </g>
    </svg>
  );
};
