import React from "react";
import { AbsoluteFill, Easing, useCurrentFrame } from "remotion";
import { C, tw, Heading, Pop, cardStyle, Shine, Burst, s } from "./comun";

// 2. Strengths
const Stat: React.FC<{ x: number; delay: number; value: number; suffix: string; label: string; color: string; icon: string }> = ({ x, delay, value, suffix, label, color, icon }) => {
  const f = useCurrentFrame();
  const v = tw(f, delay, delay + s(1.3), 0, value, Easing.out(Easing.cubic));
  const ring = tw(f, delay, delay + s(1.3), 0, 1);
  return (
    <Pop delay={delay} from="scale" style={{ left: x, top: 230, width: 420, height: 330 }}>
      <div style={{ ...cardStyle, position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", borderTop: `10px solid ${color}`, gap: 4 }}>
        <div style={{ position: "absolute", top: 22, left: 24, width: 58, height: 58, borderRadius: 29, background: `${color}22`, fontSize: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
        <svg width={380} height={20} style={{ position: "absolute", top: 40, left: 20 }} />
        <div style={{ fontSize: 108, fontWeight: 900, color, fontVariantNumeric: "tabular-nums", letterSpacing: -3, marginTop: 28 }}>
          ${Math.round(v)}
          <span style={{ fontSize: suffix.length > 1 ? 64 : 108 }}>{suffix}</span>
        </div>
        <div style={{ width: 300, height: 10, borderRadius: 5, background: `${color}22`, overflow: "hidden" }}>
          <div style={{ width: `${ring * 100}%`, height: "100%", borderRadius: 5, background: `linear-gradient(90deg, ${color}, ${color}AA)` }} />
        </div>
        <div style={{ fontSize: 34, fontWeight: 600, color: C.muted, textAlign: "center", marginTop: 10 }}>{label}</div>
        <Shine start={delay + s(1.2)} />
      </div>
    </Pop>
  );
};
export const SceneStrengths: React.FC = () => (
  <AbsoluteFill>
    <Heading kicker="WHERE YOU STAND" title="A strong starting point" />
    <Stat x={70} delay={s(2.8)} value={247} suffix="K" label="total assets" color={C.blue} icon="🏦" />
    <Stat x={540} delay={s(4.2)} value={145} suffix="K" label="invested" color={C.purple} icon="📈" />
    <Stat x={1010} delay={s(6.3)} value={43} suffix="K/yr" label="saved · 23.9% of income" color={C.green} icon="🐷" />
    <Pop delay={s(7.2)} from="scale" style={{ left: 300, top: 640, padding: "20px 46px", borderRadius: 60, background: `linear-gradient(90deg, ${C.green}, #17A07A)`, color: "#fff", fontSize: 44, fontWeight: 800, boxShadow: "0 14px 30px rgba(31,181,138,0.4)" }}>
      ✓ Full $7,000 employer match captured
    </Pop>
    <Burst start={s(7.4)} x={750} y={690} />
  </AbsoluteFill>
);
