import React from "react";
import { AbsoluteFill, Easing, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, VW, VH, clamp, ease, tw, useSpring, Heading, Pop, cardStyle, s } from "./comun";

// 6. Protection
const CoverRow: React.FC<{ y: number; delay: number; title: string; have: number; recLow: number; recHigh: number; haveLabel: string; recLabel: string }> = ({ y, delay, title, have, recLow, recHigh, haveLabel, recLabel }) => {
  const f = useCurrentFrame();
  const PX = 0.55;
  const X = 420;
  const g = tw(f, delay + s(0.2), delay + s(1.2), 0, 1);
  const r = tw(f, delay + s(0.8), delay + s(1.8), 0, 1);
  return (
    <Pop delay={delay} from="left" style={{ left: 70, top: y, width: 1400, height: 170 }}>
      <div style={{ position: "absolute", top: 22, fontSize: 44, fontWeight: 800, color: C.ink }}>{title}</div>
      <div style={{ position: "absolute", left: X - 70, top: 0, width: recHigh * PX * r, height: 100, background: C.greenSoft, borderRadius: 14 }} />
      {recHigh > recLow ? <div style={{ position: "absolute", left: X - 70 + recLow * PX, top: 0, width: (recHigh - recLow) * PX * r, height: 100, background: C.green, opacity: 0.35, borderRadius: 14 }} /> : null}
      <div style={{ position: "absolute", left: X - 70 + recLow * PX - 3, top: -8, width: 6, height: 116, background: C.green, opacity: r, borderRadius: 3 }} />
      <div style={{ position: "absolute", left: X - 70, top: 20, width: Math.max(10, have * PX * g), height: 60, background: C.red, borderRadius: 10 }} />
      <div style={{ position: "absolute", left: X - 70, top: 114, fontSize: 30, fontWeight: 800, color: C.red, opacity: g }}>{haveLabel}</div>
      <div style={{ position: "absolute", left: X - 70 + recLow * PX, top: 114, fontSize: 30, fontWeight: 700, color: C.green, whiteSpace: "nowrap", opacity: r }}>{recLabel}</div>
    </Pop>
  );
};
export const SceneProtection: React.FC = () => (
  <AbsoluteFill>
    <Heading kicker="PROTECTION" title="Below the suggested levels" />
    <CoverRow y={220} delay={s(1.2)} title="Life insurance" have={180} recLow={900} recHigh={1800} haveLabel="You: $180K" recLabel="Suggested: $900K–$1.8M" />
    <CoverRow y={440} delay={s(3.4)} title="Umbrella" have={0} recLow={1000} recHigh={1000} haveLabel="You: none" recLabel="Suggested: $1M minimum" />
    <Pop delay={s(6.5)} from="up" style={{ left: 70, top: 660, padding: "20px 36px", ...cardStyle, display: "flex", gap: 24, alignItems: "center" }}>
      <div style={{ fontSize: 62 }}>💳</div>
      <div>
        <div style={{ fontSize: 40, fontWeight: 800, color: C.ink }}>Amex · $3,500 at 20%</div>
        <div style={{ fontSize: 28, fontWeight: 600, color: C.muted }}>At $200/month, paid off by July 2028</div>
      </div>
    </Pop>
  </AbsoluteFill>
);
