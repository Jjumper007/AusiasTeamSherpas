import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { C, VW, VH, clamp, easeInOut, tw, useSpring, Pop, s } from "./comun";

// 0. Hook: retire at 58, a trip every year.
const WORDS_1 = ["Retire", "at", "58."];
const WORDS_2 = ["A", "trip", "every", "year."];

const Words: React.FC<{ words: string[]; start: number; top: number; color?: (i: number) => string }> = ({ words, start, top, color }) => {
  const f = useCurrentFrame();
  let x = 0;
  return (
    <div style={{ position: "absolute", left: 80, top, display: "flex", gap: 26, fontSize: 112, fontWeight: 900, letterSpacing: -3, lineHeight: 1.05 }}>
      {words.map((w, i) => {
        const p = tw(f, start + i * 5, start + i * 5 + 20, 0, 1);
        x += w.length;
        return (
          <span key={i} style={{ display: "inline-block", opacity: p, translate: `0px ${(1 - p) * 70}px`, rotate: `${(1 - p) * 5}deg`, filter: `blur(${(1 - p) * 10}px)`, color: color ? color(i) : C.ink }}>
            {w}
          </span>
        );
      })}
    </div>
  );
};

export const SceneHook: React.FC = () => {
  const f = useCurrentFrame();
  const sun = useSpring(s(1), 11);
  const p = tw(f, s(1.6), s(5.6), 0, 1, Easing.inOut(Easing.quad));
  const A: [number, number] = [60, 790];
  const B: [number, number] = [760, 340];
  const D: [number, number] = [1440, 650];
  const bez = (i: 0 | 1, t: number) => (1 - t) * (1 - t) * A[i] + 2 * (1 - t) * t * B[i] + t * t * D[i];
  const tan = (t: number) => Math.atan2(2 * (1 - t) * (B[1] - A[1]) + 2 * t * (D[1] - B[1]), 2 * (1 - t) * (B[0] - A[0]) + 2 * t * (D[0] - B[0]));
  const trail = Array.from({ length: 16 }, (_, k) => Math.max(0, p - k * 0.022));
  return (
    <AbsoluteFill>
      {/* sun + rays */}
      <div style={{ position: "absolute", left: 1010, top: 130, width: 440, height: 440, scale: interpolate(sun, [0, 1], [0.2, 1]), opacity: Math.min(1, sun) }}>
        <div style={{ position: "absolute", inset: -120, rotate: `${f * 0.5}deg` }}>
          {Array.from({ length: 14 }, (_, i) => (
            <div key={i} style={{ position: "absolute", left: "50%", top: "50%", width: 12, height: 320, marginLeft: -6, marginTop: -160, rotate: `${i * (360 / 14)}deg`, background: "linear-gradient(180deg, rgba(255,194,61,0.0) 0%, rgba(255,194,61,0.5) 25%, rgba(255,194,61,0) 50%)" }} />
          ))}
        </div>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: `radial-gradient(circle at 38% 34%, #FFE79A, ${C.yellow} 58%, #FFB52B 100%)`, boxShadow: "0 0 90px 30px rgba(255,194,61,0.45)" }} />
      </div>
      <div style={{ position: "absolute", left: 1010, top: 240, width: 440, textAlign: "center", fontSize: 200, fontWeight: 900, color: C.ink, letterSpacing: -6, opacity: Math.min(1, sun), scale: interpolate(sun, [0, 1], [0.4, 1]) }}>
        {Math.round(tw(f, s(1), s(2.1), 40, 58))}
      </div>
      <div style={{ position: "absolute", left: 1010, top: 468, width: 440, textAlign: "center", fontSize: 30, fontWeight: 800, letterSpacing: 8, color: C.ink, opacity: tw(f, s(2), s(2.6), 0, 0.7) }}>YEARS OLD</div>

      {/* flight path */}
      <svg width={VW} height={VH} style={{ position: "absolute" }}>
        <path d={`M ${A[0]} ${A[1]} Q ${B[0]} ${B[1]} ${D[0]} ${D[1]}`} fill="none" stroke={C.blue} strokeWidth={5} strokeDasharray="4 18" strokeLinecap="round" opacity={0.28} />
        {trail.map((t, k) => (
          <circle key={k} cx={bez(0, t)} cy={bez(1, t)} r={Math.max(0, 11 - k * 0.6)} fill={C.blue} opacity={p > 0 && p < 1 ? (1 - k / 16) * 0.35 : 0} />
        ))}
      </svg>
      <div style={{ position: "absolute", fontSize: 84, left: bez(0, p) - 42, top: bez(1, p) - 50, rotate: `${(tan(p) * 180) / Math.PI + 18}deg`, opacity: p > 0 && p < 0.98 ? 1 : 0, filter: "drop-shadow(0 12px 10px rgba(0,0,0,0.22))" }}>✈️</div>
      <div style={{ position: "absolute", left: D[0] - 40, top: D[1] - 36, fontSize: 66, scale: tw(f, s(5.2), s(5.9), 0, 1, Easing.out(Easing.back(2))), opacity: f > s(5.2) ? 1 : 0 }}>📍</div>

      <Pop delay={s(0.5)} from="left" style={{ left: 80, top: 160 }}>
        <div style={{ display: "inline-block", fontSize: 31, fontWeight: 800, color: "#fff", letterSpacing: 5, padding: "12px 26px", borderRadius: 40, background: `linear-gradient(90deg, ${C.blue}, ${C.purple})`, boxShadow: "0 12px 26px rgba(59,125,221,0.35)" }}>MICHAEL · YOUR PLAN, EXPLAINED</div>
      </Pop>
      <Words words={WORDS_1} start={s(0.9)} top={238} color={(i) => (i === 2 ? C.blue : C.ink)} />
      <Words words={WORDS_2} start={s(1.6)} top={366} color={(i) => (i === 3 ? C.orange : C.ink)} />
      <div style={{ position: "absolute", left: 80, top: 516, width: tw(f, s(2.4), s(3.2), 0, 560), height: 8, borderRadius: 4, background: `linear-gradient(90deg, ${C.yellow}, ${C.orange})` }} />
      <Pop delay={s(2.4)} from="up" style={{ left: 80, top: 546 }}>
        <div style={{ fontSize: 38, fontWeight: 600, color: C.muted }}>Financial Health & Investment Analysis · Nov 2026</div>
      </Pop>
    </AbsoluteFill>
  );
};
