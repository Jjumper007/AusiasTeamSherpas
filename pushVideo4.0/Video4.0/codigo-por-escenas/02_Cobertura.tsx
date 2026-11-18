import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Backpack, Check, Landmark, CreditCard, ShieldCheck, TrendingUp, TreePalm, Wallet } from "lucide-react";
import { C, VW, body, display, clamp, tw, Heading, Pop, IconTile, cardStyle, s } from "./comun";
import { ease } from "./comun";

// 1. What the report covers. Metaphor: the gear check before a climb.
const AREAS = [
  { icon: TreePalm, title: "Retirement & goals", color: C.blue },
  { icon: Landmark, title: "Assets", color: C.chartPurple },
  { icon: CreditCard, title: "Debt", color: C.chartDebt },
  { icon: Wallet, title: "Savings & expenses", color: C.chartRent },
  { icon: ShieldCheck, title: "Protection", color: C.chartSavings },
  { icon: TrendingUp, title: "Investments", color: C.chartTeal },
];
export const SceneCovers: React.FC = () => {
  const f = useCurrentFrame();
  const scanF = interpolate(f, [s(3.2), s(5.6)], [0, 6], clamp);
  const scan = Math.floor(scanF);
  const local = scanF - scan;
  const packIn = tw(f, s(0.2), s(1), 0, 1, ease);
  return (
    <AbsoluteFill>
      <Heading title="Six areas, one plan" />
      {/* the pack being checked */}
      <div style={{ position: "absolute", left: 70, top: 160, display: "flex", alignItems: "center", gap: 16, opacity: packIn, translate: `${(1 - packIn) * -40}px 0px` }}>
        <Backpack size={40} strokeWidth={1.75} color={C.blue} />
        <div style={body(34, C.ink2, 500)}>Like checking your gear before a climb</div>
      </div>
      {AREAS.map((a, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const lit = f > s(3.2) && i === scan;
        const done = f > s(3.2) && i < scan;
        const tickAt = s(3.2) + (i + 1) * (s(2.4) / 6);
        const Ic = a.icon;
        return (
          <Pop key={a.title} delay={s(0.4 + i * 0.22)} from="scale" style={{ left: 70 + col * 465, top: 250 + row * 280, width: 430, height: 250 }}>
            <div style={{ ...cardStyle, position: "absolute", inset: 0, boxSizing: "border-box", border: `4px solid ${lit || done ? a.color : C.hairline}`, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 18, scale: lit ? 1 + 0.06 * Math.min(1, local * 6) : 1, translate: `0px ${Math.sin(f / 22 + i * 1.3) * 3}px` }}>
              <IconTile icon={Ic} size={112} bg={`${a.color}1A`} color={a.color} />
              <div style={display(38)}>{a.title}</div>
              <div style={{ position: "absolute", top: 18, right: 20, width: 46, height: 46, borderRadius: 23, background: a.color, display: "flex", alignItems: "center", justifyContent: "center", scale: done ? tw(f, tickAt, tickAt + 10, 0, 1, ease) : 0 }}>
                <Check size={28} strokeWidth={2.5} color="#fff" />
              </div>
            </div>
          </Pop>
        );
      })}
      {/* ice axe sweeping across the cards */}
      <div style={{ position: "absolute", left: 70, top: 820, width: VW - 140, height: 6, borderRadius: 3, background: C.hairline }}>
        <div style={{ width: `${Math.min(1, scanF / 6) * 100}%`, height: "100%", borderRadius: 3, background: C.blue }} />
      </div>
    </AbsoluteFill>
  );
};
