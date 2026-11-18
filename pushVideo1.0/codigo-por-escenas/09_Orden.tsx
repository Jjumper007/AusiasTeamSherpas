import React from "react";
import { AbsoluteFill, Easing, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, VW, VH, clamp, ease, tw, useSpring, Heading, Pop, cardStyle, s } from "./comun";

// 8. Order
export const SceneOrder: React.FC = () => {
  const f = useCurrentFrame();
  const steps = [
    { icon: "🛟", title: "Cash cushion", sub: "+$16,530 to reach 5 months", color: C.blue },
    { icon: "💳", title: "Clear the 20% card", sub: "$3,500 balance", color: C.red },
    { icon: "⛰️", title: "Add to retirement", sub: "401(k) room $7,500 · Roth IRA up to $4,500", color: C.green },
  ];
  const line = tw(f, s(3.3), s(5.8), 0, 1, Easing.inOut(Easing.quad));
  const shuffle = (i: number) => (f < s(3.2) ? Math.sin(f / 4 + i * 2) * 14 : 0);
  return (
    <AbsoluteFill>
      <Heading kicker="WHERE TO START" title="Order matters" />
      <svg width={VW} height={VH} style={{ position: "absolute" }}>
        <line x1={170} y1={420} x2={170 + 1160 * line} y2={420} stroke={C.ink} strokeWidth={6} strokeDasharray="16 14" opacity={0.5} />
      </svg>
      {steps.map((st, i) => (
        <Pop key={st.title} delay={s(0.3 + i * 0.25)} from="up" style={{ left: 60 + i * 475, top: 290 + shuffle(i), width: 430, ...cardStyle, padding: "26px 28px", boxSizing: "border-box", borderTop: `10px solid ${st.color}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ width: 66, height: 66, borderRadius: 33, background: st.color, color: "#fff", fontSize: 38, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", scale: f > s(3.3 + i * 0.8) ? 1 + 0.25 * Math.max(0, 1 - (f - s(3.3 + i * 0.8)) / 10) : 1 }}>
              {f > s(3.3 + i * 0.8) ? i + 1 : "?"}
            </div>
            <div style={{ fontSize: 58 }}>{st.icon}</div>
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, color: C.ink, marginTop: 12, whiteSpace: "nowrap" }}>{st.title}</div>
          <div style={{ fontSize: 28, fontWeight: 600, color: C.muted, marginTop: 6, lineHeight: 1.25 }}>{st.sub}</div>
        </Pop>
      ))}
      <Pop delay={s(6.2)} from="up" style={{ left: 0, width: VW, top: 680, textAlign: "center", fontSize: 34, fontWeight: 700, color: C.blue }}>
        We'll test this sequence with you, step by step.
      </Pop>
    </AbsoluteFill>
  );
};
