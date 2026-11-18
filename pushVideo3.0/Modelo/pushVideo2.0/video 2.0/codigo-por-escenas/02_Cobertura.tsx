import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { C, clamp, tw, Heading, Pop, cardStyle, Shine, s } from "./comun";

// 1. What the report covers
const AREAS = [
  { icon: "🏖️", title: "Retirement & goals", color: C.blue },
  { icon: "🏦", title: "Assets", color: C.purple },
  { icon: "💳", title: "Debt", color: C.red },
  { icon: "💵", title: "Savings & expenses", color: C.orange },
  { icon: "🛡️", title: "Protection", color: C.green },
  { icon: "📈", title: "Investments", color: C.cyan },
];
export const SceneCovers: React.FC = () => {
  const f = useCurrentFrame();
  const scanF = interpolate(f, [s(3.2), s(5.6)], [0, 6], clamp);
  const scan = Math.floor(scanF);
  const local = scanF - scan;
  return (
    <AbsoluteFill>
      <Heading kicker="YOUR REPORT" title="Six areas, one plan" />
      {AREAS.map((a, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const lit = f > s(3.2) && i === scan;
        const done = f > s(3.2) && i < scan;
        const glow = lit ? Math.sin(local * Math.PI) : 0;
        return (
          <Pop key={a.title} delay={s(0.4 + i * 0.22)} from="scale" style={{ left: 70 + col * 465, top: 230 + row * 300, width: 430, height: 262 }}>
            <div style={{ ...cardStyle, position: "absolute", inset: 0, boxSizing: "border-box", border: `5px solid ${lit || done ? a.color : "transparent"}`, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 14, scale: lit ? 1 + 0.07 * Math.min(1, local * 6) : 1, boxShadow: lit ? `0 0 0 10px ${a.color}22, 0 26px 50px ${a.color}55` : cardStyle.boxShadow }}>
              <div style={{ width: 118, height: 118, borderRadius: 59, background: `linear-gradient(145deg, ${a.color}, ${a.color}BB)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64, boxShadow: `0 14px 26px ${a.color}55`, translate: `0px ${Math.sin(f / 14 + i * 1.3) * 5}px`, scale: 1 + glow * 0.12 }}>{a.icon}</div>
              <div style={{ fontSize: 37, fontWeight: 800, color: C.ink }}>{a.title}</div>
              <div style={{ position: "absolute", top: 16, right: 18, width: 44, height: 44, borderRadius: 22, background: a.color, color: "#fff", fontSize: 28, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", scale: done ? tw(f, s(3.2 + (i + 1) * 0.4), s(3.2 + (i + 1) * 0.4) + 10, 0, 1, Easing.out(Easing.back(3))) : 0 }}>✓</div>
              <Shine start={s(0.9 + i * 0.22)} />
            </div>
          </Pop>
        );
      })}
    </AbsoluteFill>
  );
};
