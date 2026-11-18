import React from "react";
import { AbsoluteFill, Easing, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, VW, VH, clamp, ease, tw, useSpring, Heading, Pop, cardStyle, s } from "./comun";

// 4. January 2027
export const SceneJanuary: React.FC = () => {
  const f = useCurrentFrame();
  const baseY = 790;
  const PX = 2.9;
  const bar = (x: number, low: number, high: number, delay: number, color: string, label: string, value: string) => {
    const g = tw(f, delay, delay + s(1), 0, 1, Easing.out(Easing.back(1.4)));
    const hLow = low * PX * g;
    const hHigh = high * PX * g;
    return (
      <React.Fragment key={label}>
        <div style={{ position: "absolute", left: x, top: baseY - hHigh, width: 190, height: Math.max(0, hHigh - hLow), background: color, opacity: 0.35, borderRadius: "14px 14px 0 0" }} />
        <div style={{ position: "absolute", left: x, top: baseY - hLow, width: 190, height: hLow, background: color, borderRadius: high === low ? "14px 14px 0 0" : 0 }} />
        <div style={{ position: "absolute", left: x - 50, width: 290, top: baseY - hHigh - 64, textAlign: "center", fontSize: 40, fontWeight: 900, color, opacity: Math.min(1, g) }}>{value}</div>
        <div style={{ position: "absolute", left: x - 55, width: 300, top: baseY + 14, textAlign: "center", fontSize: 28, fontWeight: 700, color: C.muted, opacity: Math.min(1, g), lineHeight: 1.15, whiteSpace: "pre-line" }}>{label}</div>
      </React.Fragment>
    );
  };
  const flip = useSpring(s(0.3), 12);
  return (
    <AbsoluteFill>
      <Heading kicker="JANUARY 2027" title="Two goals, one cash pile" />
      <div style={{ position: "absolute", left: 60, top: 220, width: 540, ...cardStyle, overflow: "hidden", opacity: Math.min(1, flip), rotate: `${interpolate(flip, [0, 1], [-10, 0])}deg`, scale: interpolate(flip, [0, 1], [0.6, 1]) }}>
        <div style={{ background: C.red, color: "#fff", fontSize: 40, fontWeight: 800, padding: "14px 0", textAlign: "center" }}>JAN 2027</div>
        <div style={{ padding: "26px 34px", display: "flex", flexDirection: "column", gap: 18 }}>
          <Pop delay={s(0.8)} from="left" style={{ position: "relative" }}>
            <div style={{ fontSize: 42, fontWeight: 800, color: C.ink, whiteSpace: "nowrap" }}>🏠 Home · $113,300</div>
            <div style={{ fontSize: 28, fontWeight: 600, color: C.muted }}>down payment on a $550K home</div>
          </Pop>
          <Pop delay={s(1.5)} from="left" style={{ position: "relative" }}>
            <div style={{ fontSize: 42, fontWeight: 800, color: C.ink }}>✈️ Trip · $3,500</div>
          </Pop>
        </div>
      </div>
      <div style={{ position: "absolute", left: 660, top: baseY, width: tw(f, s(3), s(3.8), 0, 790), height: 5, background: C.ink }} />
      {bar(710, 30, 30, s(3.3), C.blue, "Cash today\n(≈3.2 months)", "$30K")}
      {bar(970, 46.5, 55.8, s(5), C.green, "5–6 month\ncushion", "$47–56K")}
      {bar(1230, 163.3, 172.6, s(6.8), C.red, "Cushion +\nJan 2027 goals", "$163–173K")}
    </AbsoluteFill>
  );
};
