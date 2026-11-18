import React from "react";
import { AbsoluteFill, Easing, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, VW, VH, clamp, ease, tw, useSpring, Heading, Pop, cardStyle, s } from "./comun";

// 0. Hook
export const SceneHook: React.FC = () => {
  const f = useCurrentFrame();
  const sun = useSpring(s(1), 11);
  const p = tw(f, s(1.6), s(5.6), 0, 1, Easing.inOut(Easing.quad));
  const bez = (a: number, b: number, c: number) => (1 - p) * (1 - p) * a + 2 * (1 - p) * p * b + p * p * c;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 1010, top: 160, width: 400, height: 400, borderRadius: 200, background: `radial-gradient(circle, ${C.yellow}, #FFD98A 58%, rgba(255,217,138,0) 72%)`, scale: interpolate(sun, [0, 1], [0.3, 1]), opacity: Math.min(1, sun) }} />
      <div style={{ position: "absolute", left: 1010, top: 255, width: 400, textAlign: "center", fontSize: 170, fontWeight: 900, color: C.ink, opacity: Math.min(1, sun), scale: interpolate(sun, [0, 1], [0.5, 1]) }}>58</div>
      <svg width={VW} height={VH} style={{ position: "absolute" }}>
        <path d="M 60 780 Q 760 360 1440 640" fill="none" stroke={C.blue} strokeWidth={5} strokeDasharray="14 14" opacity={0.3} />
      </svg>
      <div style={{ position: "absolute", fontSize: 76, left: bez(60, 760, 1440) - 38, top: bez(780, 360, 640) - 50, rotate: `${interpolate(p, [0, 1], [-25, 18])}deg`, opacity: p > 0 && p < 1 ? 1 : 0 }}>✈️</div>
      <Pop delay={s(0.6)} from="left" style={{ left: 80, top: 200 }}>
        <div style={{ fontSize: 34, fontWeight: 700, color: C.blue, letterSpacing: 5 }}>MICHAEL · YOUR PLAN, EXPLAINED</div>
      </Pop>
      <Pop delay={s(0.9)} from="left" style={{ left: 80, top: 250 }}>
        <div style={{ fontSize: 104, fontWeight: 900, color: C.ink, lineHeight: 1.05 }}>Retire at 58.</div>
      </Pop>
      <Pop delay={s(1.5)} from="left" style={{ left: 80, top: 362 }}>
        <div style={{ fontSize: 104, fontWeight: 900, color: C.ink, lineHeight: 1.05 }}>A trip every year.</div>
      </Pop>
      <Pop delay={s(2.2)} from="up" style={{ left: 80, top: 510 }}>
        <div style={{ fontSize: 38, fontWeight: 600, color: C.muted }}>Financial Health & Investment Analysis · Nov 2026</div>
      </Pop>
    </AbsoluteFill>
  );
};
