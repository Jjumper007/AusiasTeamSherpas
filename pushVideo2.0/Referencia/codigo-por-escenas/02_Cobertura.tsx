import React from "react";
import { AbsoluteFill, Easing, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, VW, VH, clamp, ease, tw, useSpring, Heading, Pop, cardStyle, s } from "./comun";

// 1. What the report covers
const AREAS = [
  { icon: "🏖️", title: "Retirement & goals", color: C.blue },
  { icon: "🏦", title: "Assets", color: C.purple },
  { icon: "💳", title: "Debt", color: C.red },
  { icon: "💵", title: "Savings & expenses", color: C.orange },
  { icon: "🛡️", title: "Protection", color: C.green },
  { icon: "📈", title: "Investments", color: "#2C9BD6" },
];
export const SceneCovers: React.FC = () => {
  const f = useCurrentFrame();
  const scan = Math.floor(interpolate(f, [s(3.2), s(5.6)], [0, 6], clamp));
  return (
    <AbsoluteFill>
      <Heading kicker="YOUR REPORT" title="Six areas, one plan" />
      {AREAS.map((a, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const lit = f > s(3.2) && i === scan;
        return (
          <Pop key={a.title} delay={s(0.4 + i * 0.22)} from="scale" style={{ left: 70 + col * 465, top: 220 + row * 300, width: 430, height: 260, ...cardStyle, boxSizing: "border-box", border: `5px solid ${lit ? a.color : "transparent"}`, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 14, scale: lit ? 1.06 : 1 }}>
            <div style={{ width: 110, height: 110, borderRadius: 55, background: a.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 62 }}>{a.icon}</div>
            <div style={{ fontSize: 38, fontWeight: 800, color: C.ink }}>{a.title}</div>
          </Pop>
        );
      })}
    </AbsoluteFill>
  );
};
