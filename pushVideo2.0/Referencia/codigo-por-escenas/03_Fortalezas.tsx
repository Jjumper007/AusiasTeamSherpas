import React from "react";
import { AbsoluteFill, Easing, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, VW, VH, clamp, ease, tw, useSpring, Heading, Pop, cardStyle, s } from "./comun";

// 2. Strengths
const Stat: React.FC<{ x: number; delay: number; value: number; suffix: string; label: string; color: string }> = ({ x, delay, value, suffix, label, color }) => {
  const f = useCurrentFrame();
  const v = tw(f, delay, delay + s(1.2), 0, value);
  return (
    <Pop delay={delay} from="scale" style={{ left: x, top: 230, width: 420, height: 310, ...cardStyle, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", borderTop: `10px solid ${color}` }}>
      <div style={{ fontSize: 100, fontWeight: 900, color, fontVariantNumeric: "tabular-nums" }}>
        ${Math.round(v)}
        {suffix}
      </div>
      <div style={{ fontSize: 36, fontWeight: 600, color: C.muted, textAlign: "center" }}>{label}</div>
    </Pop>
  );
};
export const SceneStrengths: React.FC = () => (
  <AbsoluteFill>
    <Heading kicker="WHERE YOU STAND" title="A strong starting point" />
    <Stat x={70} delay={s(2.8)} value={247} suffix="K" label="total assets" color={C.blue} />
    <Stat x={540} delay={s(4.2)} value={145} suffix="K" label="invested" color={C.purple} />
    <Stat x={1010} delay={s(6.3)} value={43} suffix="K/yr" label="saved · 23.9% of income" color={C.green} />
    <Pop delay={s(7.2)} from="scale" style={{ left: 330, top: 610, padding: "18px 44px", borderRadius: 50, background: C.green, color: "#fff", fontSize: 44, fontWeight: 800, boxShadow: "0 10px 24px rgba(34,165,126,0.35)" }}>
      ✓ Full $7,000 employer match captured
    </Pop>
  </AbsoluteFill>
);
