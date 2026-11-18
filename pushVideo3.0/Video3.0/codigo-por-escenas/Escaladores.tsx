import React from "react";
import { useCurrentFrame } from "remotion";
import { C } from "./comun";

// The climbers: Sherpas' mountain metaphor. Flat-style figures with a walk cycle, a rope team and base-camp props.
// Everything is driven by `phase` (radians, advance it while the climbers move) so the legs only walk when they travel.

const SKIN = "#E8B896";
const PANTS = C.mtnIce;
const BOOT = C.navyDeep;
const PACK = C.gold;

type ClimberProps = {
  phase: number; // walk cycle
  jacket: string;
  hat: string;
  moving?: number; // 0 idle .. 1 full stride
  lean?: number; // deg, forward lean
  load?: number; // extra weight bend 0..1 (porter)
  pole?: boolean;
};

// viewBox 0 0 120 160, facing right, feet on y = 150.
export const Climber: React.FC<ClimberProps> = ({ phase, jacket, hat, moving = 1, lean = 6, load = 0, pole = true }) => {
  const f = useCurrentFrame();
  const bob = Math.abs(Math.sin(phase)) * 2.4 * moving + Math.sin(f / 14) * 0.8;
  const hip = { x: 60, y: 92 - bob };
  const leg = (ph: number) => {
    const swing = Math.sin(ph) * 30 * moving;
    const lift = Math.max(0, Math.cos(ph)) * 22 * moving;
    const kx = hip.x + Math.sin((swing * Math.PI) / 180) * 26;
    const ky = hip.y + Math.cos((swing * Math.PI) / 180) * 26;
    const fx = kx + Math.sin(((swing - 20 - lift) * Math.PI) / 180) * 28;
    const fy = Math.min(150, ky + Math.cos(((swing - 20 - lift) * Math.PI) / 180) * 28);
    return { kx, ky, fx, fy: moving < 0.05 ? 150 : fy };
  };
  const a = leg(phase);
  const b = leg(phase + Math.PI);
  const handBack = { x: 56 - Math.sin(phase) * 12 * moving, y: 82 };
  const handFront = { x: 78 + Math.sin(phase) * 10 * moving, y: 78 };
  const torsoLean = lean + load * 10;
  return (
    <svg viewBox="0 0 120 160" width="100%" height="100%" style={{ overflow: "visible", display: "block" }}>
      <ellipse cx={60} cy={152} rx={30} ry={5} fill="rgba(11,15,46,0.18)" />
      {/* back leg + boot */}
      <polyline points={`${hip.x},${hip.y} ${b.kx},${b.ky} ${b.fx},${b.fy}`} fill="none" stroke={PANTS} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
      <ellipse cx={b.fx + 4} cy={b.fy + 3} rx={9} ry={5} fill={BOOT} />
      <g transform={`rotate(${torsoLean} ${hip.x} ${hip.y})`}>
        {/* pole behind */}
        {pole ? <line x1={handBack.x} y1={handBack.y} x2={handBack.x - 14 + Math.sin(phase) * 8 * moving} y2={150} stroke={C.navyMuted} strokeWidth={3} strokeLinecap="round" /> : null}
        {/* pack */}
        <rect x={32} y={48 - bob * 0.3} width={28} height={44} rx={9} fill={PACK} />
        <rect x={36} y={42 - bob * 0.3} width={20} height={12} rx={6} fill={C.warning} />
        {/* torso */}
        <rect x={46} y={50 - bob * 0.3} width={30} height={46} rx={13} fill={jacket} />
        <rect x={46} y={86 - bob * 0.3} width={30} height={7} rx={3} fill="rgba(11,15,46,0.25)" />
        {/* head + beanie */}
        <circle cx={63} cy={34 - bob * 0.4} r={13} fill={SKIN} />
        <path d={`M49 ${32 - bob * 0.4} Q51 ${14 - bob * 0.4} 64 ${14 - bob * 0.4} Q77 ${14 - bob * 0.4} 77 ${32 - bob * 0.4} Z`} fill={hat} />
        <rect x={49} y={29 - bob * 0.4} width={28} height={6} rx={3} fill="#FFFFFF" />
        <circle cx={63} cy={11 - bob * 0.4} r={4.5} fill="#FFFFFF" />
        <circle cx={69} cy={36 - bob * 0.4} r={1.8} fill={C.navyDeep} />
        {/* front arm + pole */}
        <polyline points={`66,58 ${(66 + handFront.x) / 2 + 2},${(58 + handFront.y) / 2 + 6} ${handFront.x},${handFront.y}`} fill="none" stroke={jacket} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={handFront.x} cy={handFront.y} r={5} fill={SKIN} />
        {pole ? <line x1={handFront.x} y1={handFront.y - 6} x2={handFront.x + 12 - Math.sin(phase) * 10 * moving} y2={150} stroke={C.navyMuted} strokeWidth={3.5} strokeLinecap="round" /> : null}
      </g>
      {/* front leg + boot */}
      <polyline points={`${hip.x},${hip.y} ${a.kx},${a.ky} ${a.fx},${a.fy}`} fill="none" stroke={PANTS} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx={a.fx + 4} cy={a.fy + 3} rx={9} ry={5} fill={BOOT} />
    </svg>
  );
};

// Two climbers tied by a rope. `width` is the pixel width of one climber, `gap` the spacing between them in climber widths.
export const RopeTeam: React.FC<{ phase: number; width: number; moving?: number; lean?: number; flip?: boolean; style?: React.CSSProperties }> = ({ phase, width, moving = 1, lean = 6, flip = false, style }) => {
  const f = useCurrentFrame();
  const gap = width * 0.95;
  const total = width + gap;
  const h = width * (160 / 120);
  const sag = 10 + Math.sin(f / 12) * 4;
  const ax = width * 0.62;
  const bx = gap + width * 0.38;
  const ay = h * 0.4;
  return (
    <div style={{ position: "relative", width: total, height: h, scale: flip ? "-1 1" : "1 1", ...style }}>
      <svg width={total} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <path d={`M${ax} ${ay} Q${(ax + bx) / 2} ${ay + sag + h * 0.12} ${bx} ${ay}`} fill="none" stroke={C.lavender} strokeWidth={Math.max(2.5, width * 0.035)} strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", left: 0, top: 0, width, height: h }}>
        <Climber phase={phase + 0.9} jacket={C.blue} hat={C.sky} moving={moving} lean={lean} />
      </div>
      <div style={{ position: "absolute", left: gap, top: 0, width, height: h }}>
        <Climber phase={phase} jacket={C.lavender} hat={C.blueBright} moving={moving} lean={lean} />
      </div>
    </div>
  );
};

// Base-camp tent (front view).
export const Tent: React.FC<{ width: number; color?: string }> = ({ width, color = C.sky }) => (
  <svg viewBox="0 0 120 90" width={width} height={(width * 90) / 120} style={{ overflow: "visible", display: "block" }}>
    <path d="M60 6 L112 84 L8 84 Z" fill={color} />
    <path d="M60 6 L112 84 L66 84 Z" fill="rgba(11,15,46,0.18)" />
    <path d="M60 34 L82 84 L38 84 Z" fill={C.navyDeep} opacity={0.8} />
    <line x1={60} y1={6} x2={60} y2={-8} stroke={C.navyMuted} strokeWidth={3} />
  </svg>
);

// Summit / camp flag with a waving cloth.
export const Flag: React.FC<{ height: number; color: string; wave?: number; label?: string }> = ({ height, color, wave = 1, label }) => {
  const f = useCurrentFrame();
  const w = height * 0.62;
  const a = Math.sin(f / 7) * 5 * wave;
  const b = Math.sin(f / 7 + 1.2) * 5 * wave;
  return (
    <svg viewBox="0 0 80 130" width={(height * 80) / 130} height={height} style={{ overflow: "visible", display: "block" }}>
      <line x1={8} y1={4} x2={8} y2={128} stroke={C.navyMuted} strokeWidth={4} strokeLinecap="round" />
      <path d={`M10 8 Q${30} ${4 + a} 50 ${14 + b} T${76} ${14 - a} L76 52 Q${54} ${56 + b} 36 ${48 - a} T10 52 Z`} fill={color} />
      {label ? (
        <text x={42} y={38} textAnchor="middle" fontSize={20} fontWeight={600} fill="#FFFFFF" fontFamily="Poppins, sans-serif">
          {label}
        </text>
      ) : null}
      <circle cx={8} cy={4} r={5} fill={C.navyMuted} />
      {w > 0 ? null : null}
    </svg>
  );
};
