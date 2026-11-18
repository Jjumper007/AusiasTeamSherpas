import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { C, tw, useSpring, Heading, Pop, cardStyle, s } from "./comun";

// 4. January 2027
export const SceneJanuary: React.FC = () => {
  const f = useCurrentFrame();
  const baseY = 790;
  const PX = 2.9;
  const bar = (x: number, low: number, high: number, delay: number, color: string, label: string, value: string) => {
    const g = tw(f, delay, delay + s(1.1), 0, 1, Easing.out(Easing.back(1.3)));
    const hLow = low * PX * g;
    const hHigh = high * PX * g;
    return (
      <React.Fragment key={label}>
        <div style={{ position: "absolute", left: x, top: baseY - hHigh, width: 190, height: Math.max(0, hHigh - hLow), background: `repeating-linear-gradient(135deg, ${color}55 0 10px, ${color}22 10px 20px)`, borderRadius: "16px 16px 0 0", border: `3px dashed ${color}` }} />
        <div style={{ position: "absolute", left: x, top: baseY - hLow, width: 190, height: hLow, background: `linear-gradient(180deg, ${color}, ${color}CC)`, borderRadius: high === low ? "16px 16px 0 0" : 0, boxShadow: `0 18px 30px ${color}44` }} />
        <div style={{ position: "absolute", left: x - 50, width: 290, top: baseY - hHigh - 70, textAlign: "center", fontSize: 44, fontWeight: 900, color, opacity: Math.min(1, g), scale: interpolate(g, [0, 1], [0.6, 1]) }}>{value}</div>
        <div style={{ position: "absolute", left: x - 55, width: 300, top: baseY + 16, textAlign: "center", fontSize: 28, fontWeight: 700, color: C.muted, opacity: Math.min(1, g), lineHeight: 1.15, whiteSpace: "pre-line" }}>{label}</div>
      </React.Fragment>
    );
  };
  const flip = useSpring(s(0.3), 12);
  const gap = tw(f, s(7.6), s(8.4), 0, 1);
  return (
    <AbsoluteFill>
      <Heading kicker="JANUARY 2027" title="Two goals, one cash pile" />
      <div style={{ position: "absolute", left: 60, top: 220, width: 540, ...cardStyle, overflow: "hidden", opacity: Math.min(1, flip), rotate: `${interpolate(flip, [0, 1], [-12, 0])}deg`, scale: interpolate(flip, [0, 1], [0.6, 1]), translate: `0px ${Math.sin(f / 30) * 4}px` }}>
        <div style={{ background: `linear-gradient(90deg, ${C.red}, #FF6B6B)`, color: "#fff", fontSize: 40, fontWeight: 900, padding: "14px 0", textAlign: "center", letterSpacing: 4 }}>JAN 2027</div>
        <div style={{ padding: "26px 34px", display: "flex", flexDirection: "column", gap: 18, height: 190, position: "relative" }}>
          <Pop delay={s(0.8)} from="left" style={{ position: "relative" }}>
            <div style={{ fontSize: 42, fontWeight: 800, color: C.ink, whiteSpace: "nowrap" }}>🏠 Home · $113,300</div>
            <div style={{ fontSize: 28, fontWeight: 600, color: C.muted }}>down payment on a $550K home</div>
          </Pop>
          <Pop delay={s(1.5)} from="left" style={{ position: "relative" }}>
            <div style={{ fontSize: 42, fontWeight: 800, color: C.ink }}>✈️ Trip · $3,500</div>
          </Pop>
        </div>
      </div>
      <div style={{ position: "absolute", left: 660, top: baseY, width: tw(f, s(3), s(3.8), 0, 790), height: 5, background: C.ink, borderRadius: 3 }} />
      {bar(710, 30, 30, s(3.3), C.blue, "Cash today\n(≈3.2 months)", "$30K")}
      {bar(970, 46.5, 55.8, s(5), C.green, "5–6 month\ncushion", "$47–56K")}
      {bar(1230, 163.3, 172.6, s(6.8), C.red, "Cushion +\nJan 2027 goals", "$163–173K")}
      <Pop delay={s(8.2)} from="scale" style={{ left: 640, top: 250, padding: "14px 30px", borderRadius: 20, background: C.redSoft, color: C.red, fontSize: 38, fontWeight: 900, border: `4px solid ${C.red}`, opacity: gap }}>
        ≈ $133K short
      </Pop>
    </AbsoluteFill>
  );
};
