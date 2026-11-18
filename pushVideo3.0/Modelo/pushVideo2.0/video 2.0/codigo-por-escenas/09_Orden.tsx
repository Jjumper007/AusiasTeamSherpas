import React from "react";
import { AbsoluteFill, Easing, useCurrentFrame } from "remotion";
import { C, VW, VH, tw, Heading, Pop, cardStyle, Burst, s } from "./comun";

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
        <line x1={170} y1={420} x2={170 + 1160 * line} y2={420} stroke={C.ink} strokeWidth={6} strokeDasharray="16 14" opacity={0.45} />
        <circle cx={170 + 1160 * line} cy={420} r={f > s(3.3) && line < 1 ? 12 : 0} fill={C.yellow} stroke={C.ink} strokeWidth={4} />
      </svg>
      {steps.map((st, i) => {
        const at = s(3.3 + i * 0.8);
        const hit = f > at ? 1 + 0.3 * Math.max(0, 1 - (f - at) / 12) : 1;
        return (
          <React.Fragment key={st.title}>
            <Pop delay={s(0.3 + i * 0.25)} from="up" style={{ left: 60 + i * 475, top: 290 + shuffle(i), width: 430 }}>
              <div style={{ ...cardStyle, padding: "26px 28px", boxSizing: "border-box", borderTop: `10px solid ${st.color}`, boxShadow: f > at ? `0 0 0 8px ${st.color}18, 0 24px 44px ${st.color}33` : cardStyle.boxShadow }}>
                <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                  <div style={{ width: 70, height: 70, borderRadius: 35, background: `linear-gradient(145deg, ${st.color}, ${st.color}BB)`, color: "#fff", fontSize: 40, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", scale: hit, boxShadow: `0 10px 20px ${st.color}55` }}>
                    {f > at ? i + 1 : "?"}
                  </div>
                  <div style={{ fontSize: 58 }}>{st.icon}</div>
                </div>
                <div style={{ fontSize: 36, fontWeight: 800, color: C.ink, marginTop: 12, whiteSpace: "nowrap" }}>{st.title}</div>
                <div style={{ fontSize: 28, fontWeight: 600, color: C.muted, marginTop: 6, lineHeight: 1.25 }}>{st.sub}</div>
              </div>
            </Pop>
            <Burst start={at} x={60 + i * 475 + 70} y={330} colors={[st.color, C.yellow]} count={10} power={90} />
          </React.Fragment>
        );
      })}
      <Pop delay={s(6.2)} from="up" style={{ left: 0, width: VW, top: 690, textAlign: "center", fontSize: 36, fontWeight: 800, color: C.blue }}>
        We'll test this sequence with you, step by step.
      </Pop>
    </AbsoluteFill>
  );
};
