import React from "react";

// The advisor: original flat-style presenter in a navy suit, white shirt and burgundy tie.
// Fully driven by props (no internal timing) so the parent can blend poses smoothly.

export type AdvisorPose = "idle" | "point" | "present" | "explain" | "welcome" | "thumbsUp" | "think" | "count";
export type AdvisorExpr = "happy" | "neutral" | "concerned";

type Pt = [number, number];
export type ArmSet = { le: Pt; lh: Pt; re: Pt; rh: Pt };

// Shoulders: L (108, 206), R (192, 206). viewBox 0 0 300 520.
export const ADVISOR_POSES: Record<AdvisorPose, ArmSet> = {
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
  skinShade: "#B57A55",
  hair: "#2A1E1A",
  suit: "#2B3A67",
  suitShade: "#22305A",
  trousers: "#1F2A4A",
  shirt: "#FFFFFF",
  tie: "#B23A48",
  tieShade: "#952E3B",
  shoe: "#3A2A22",
  ink: "#1C1A2E",
};

const EXPR: Record<AdvisorExpr, { brows: [Pt, Pt, Pt, Pt]; smile: number }> = {
  happy: { brows: [[118, 86], [138, 82], [162, 82], [182, 86]], smile: 1 },
  neutral: { brows: [[118, 88], [138, 86], [162, 86], [182, 88]], smile: 0.45 },
  concerned: { brows: [[118, 88], [138, 82], [162, 82], [182, 88]], smile: -0.15 },
};

type Props = {
  arms: ArmSet;
  handStyle: AdvisorPose;
  expr: AdvisorExpr;
  mouth: number; // 0 closed .. 1 wide open
  blink: boolean;
  breath: number; // px
  headTilt: number; // deg
  lean: number; // deg
  look: number; // pupil x offset
  width: number;
};

export const Advisor: React.FC<Props> = ({ arms, handStyle, expr, mouth, blink, breath, headTilt, lean, look, width }) => {
  const e = EXPR[expr];
  const sleeve = (sh: Pt, el: Pt, h: Pt, key: string) => {
    // cuff sits 86% along the forearm
    const cuff: Pt = [el[0] + (h[0] - el[0]) * 0.8, el[1] + (h[1] - el[1]) * 0.8];
    return (
      <g key={key}>
        <polyline points={`${sh[0]},${sh[1]} ${el[0]},${el[1]} ${cuff[0]},${cuff[1]}`} fill="none" stroke={COL.suit} strokeWidth={32} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={cuff[0]} cy={cuff[1]} r={13} fill={COL.shirt} />
      </g>
    );
  };
  const hand = (h: Pt, style: AdvisorPose, right: boolean) => {
    if (right && style === "thumbsUp") {
      return (
        <g>
          <rect x={h[0] - 15} y={h[1] - 2} width={30} height={28} rx={11} fill={COL.skin} />
          <rect x={h[0] - 3} y={h[1] - 26} width={12} height={30} rx={6} fill={COL.skin} />
        </g>
      );
    }
    if (right && (style === "count" || style === "point")) {
      const up = style === "count";
      return (
        <g>
          <circle cx={h[0]} cy={h[1]} r={14} fill={COL.skin} />
          {up ? (
            <rect x={h[0] - 5} y={h[1] - 34} width={10} height={30} rx={5} fill={COL.skin} />
          ) : (
            <rect x={h[0] + 4} y={h[1] - 14} width={28} height={10} rx={5} fill={COL.skin} transform={`rotate(-32 ${h[0]} ${h[1]})`} />
          )}
        </g>
      );
    }
    const open = style === "present" || style === "welcome" || style === "explain";
    return open ? <ellipse cx={h[0]} cy={h[1]} rx={15} ry={17} fill={COL.skin} /> : <circle cx={h[0]} cy={h[1]} r={14} fill={COL.skin} />;
  };
  const smilePath = (() => {
    const c = 150;
    const y = 146;
    const k = e.smile * 10;
    return `M${c - 15} ${y} Q${c} ${y + k} ${c + 15} ${y}`;
  })();

  return (
    <svg width={width} height={(width * 520) / 300} viewBox="0 0 300 520" style={{ overflow: "visible" }}>
      <ellipse cx={150} cy={508} rx={86} ry={11} fill="rgba(20,20,40,0.22)" />
      <g transform={`rotate(${lean} 150 505)`}>
        {/* legs */}
        <path d="M112 318 L148 318 L146 494 L116 494 Z" fill={COL.trousers} />
        <path d="M152 318 L188 318 L184 494 L154 494 Z" fill={COL.trousers} />
        <ellipse cx={126} cy={498} rx={27} ry={11} fill={COL.shoe} />
        <ellipse cx={176} cy={498} rx={27} ry={11} fill={COL.shoe} />

        <g transform={`translate(0 ${breath})`}>
          {/* torso */}
          <path d="M96 198 Q150 182 204 198 L214 332 Q150 344 86 332 Z" fill={COL.suit} />
          <path d="M131 192 L150 252 L169 192 Z" fill={COL.shirt} />
          <path d="M145 198 L155 198 L158 210 L142 210 Z" fill={COL.tieShade} />
          <path d="M142 210 L158 210 L162 262 L150 276 L138 262 Z" fill={COL.tie} />
          <path d="M131 192 L150 254 L140 266 L116 200 Z" fill={COL.suitShade} />
          <path d="M169 192 L150 254 L160 266 L184 200 Z" fill={COL.suitShade} />
          <path d="M112 236 L130 236 L126 244 L114 244 Z" fill={COL.shirt} />
          <circle cx={150} cy={292} r={4} fill={COL.ink} opacity={0.5} />
          <circle cx={150} cy={314} r={4} fill={COL.ink} opacity={0.5} />

          {/* arms */}
          {sleeve([108, 206], arms.le, arms.lh, "l")}
          {sleeve([192, 206], arms.re, arms.rh, "r")}
          {hand(arms.lh, handStyle, false)}
          {hand(arms.rh, handStyle, true)}

          {/* neck + head */}
          <rect x={139} y={156} width={22} height={38} rx={6} fill={COL.skinShade} />
          <g transform={`rotate(${headTilt} 150 170)`}>
            <ellipse cx={90} cy={116} rx={9} ry={13} fill={COL.skinShade} />
            <ellipse cx={210} cy={116} rx={9} ry={13} fill={COL.skinShade} />
            <ellipse cx={150} cy={110} rx={60} ry={64} fill={COL.skin} />
            <path d="M88 104 Q82 40 150 36 Q216 38 212 100 Q204 70 172 62 Q140 58 118 74 Q100 84 88 104 Z" fill={COL.hair} />
            <path d="M118 74 Q140 52 176 58" fill="none" stroke="#4A3830" strokeWidth={4} strokeLinecap="round" />
            {/* brows */}
            <polyline points={`${e.brows[0].join(",")} ${e.brows[1].join(",")}`} stroke={COL.hair} strokeWidth={6} strokeLinecap="round" fill="none" />
            <polyline points={`${e.brows[2].join(",")} ${e.brows[3].join(",")}`} stroke={COL.hair} strokeWidth={6} strokeLinecap="round" fill="none" />
            {/* eyes */}
            <ellipse cx={128 + look} cy={106} rx={5.5} ry={blink ? 1 : 6.5} fill={COL.ink} />
            <ellipse cx={172 + look} cy={106} rx={5.5} ry={blink ? 1 : 6.5} fill={COL.ink} />
            {/* nose */}
            <path d="M150 112 Q156 126 148 128" fill="none" stroke={COL.skinShade} strokeWidth={4} strokeLinecap="round" />
            {/* mouth */}
            {mouth > 0.08 ? (
              <g>
                <path d={`M136 144 Q150 ${146 + 4 + mouth * 16} 164 144 Z`} fill="#5A2230" />
                <path d="M138 144 L162 144" stroke="#FFFFFF" strokeWidth={3} opacity={0.9} />
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
