import React from "react";
import { AbsoluteFill, Easing, useCurrentFrame } from "remotion";
import { C, tw, Heading, Pop, cardStyle, Shine, s } from "./comun";

// 6. Protection
const CoverRow: React.FC<{ y: number; delay: number; title: string; icon: string; have: number; recLow: number; recHigh: number; haveLabel: string; recLabel: string }> = ({ y, delay, title, icon, have, recLow, recHigh, haveLabel, recLabel }) => {
  const f = useCurrentFrame();
  const PX = 0.55;
  const X = 420;
  const g = tw(f, delay + s(0.2), delay + s(1.2), 0, 1);
  const r = tw(f, delay + s(0.8), delay + s(1.8), 0, 1);
  const alert = f > delay + s(1.8) ? 0.5 + 0.5 * Math.sin((f - delay) / 6) : 0;
  return (
    <Pop delay={delay} from="left" style={{ left: 70, top: y, width: 1400, height: 180 }}>
      <div style={{ position: "absolute", top: 12, fontSize: 44, fontWeight: 800, color: C.ink }}>
        <span style={{ marginRight: 12 }}>{icon}</span>
        {title}
      </div>
      <div style={{ position: "absolute", left: X - 70, top: 0, width: recHigh * PX * r, height: 100, background: `linear-gradient(90deg, ${C.greenSoft}, #BFEEDD)`, borderRadius: 16, boxShadow: "0 10px 20px rgba(31,181,138,0.15)" }} />
      <div style={{ position: "absolute", left: X - 70 + recLow * PX - 3, top: -8, width: 6, height: 116, background: C.green, opacity: r, borderRadius: 3 }} />
      <div style={{ position: "absolute", left: X - 70, top: 20, width: Math.max(10, have * PX * g), height: 60, background: `linear-gradient(90deg, ${C.red}, #FF6A72)`, borderRadius: 12, boxShadow: `0 0 ${alert * 24}px ${C.red}99` }} />
      <div style={{ position: "absolute", left: X - 70, top: 114, fontSize: 30, fontWeight: 800, color: C.red, opacity: g }}>{haveLabel}</div>
      <div style={{ position: "absolute", left: X - 70 + recLow * PX, top: 114, fontSize: 30, fontWeight: 700, color: C.green, whiteSpace: "nowrap", opacity: r }}>{recLabel}</div>
    </Pop>
  );
};
export const SceneProtection: React.FC = () => {
  const f = useCurrentFrame();
  const coin = tw(f, s(6.5), s(7.5), 0, 1, Easing.out(Easing.back(2)));
  return (
    <AbsoluteFill>
      <Heading kicker="PROTECTION" title="Below the suggested levels" />
      <CoverRow y={220} delay={s(1.2)} title="Life insurance" icon="❤️" have={180} recLow={900} recHigh={1800} haveLabel="You: $180K" recLabel="Suggested: $900K–$1.8M" />
      <CoverRow y={440} delay={s(3.4)} title="Umbrella" icon="☂️" have={0} recLow={1000} recHigh={1000} haveLabel="You: none" recLabel="Suggested: $1M minimum" />
      <Pop delay={s(6.5)} from="up" style={{ left: 70, top: 668, padding: "20px 40px", ...cardStyle, display: "flex", gap: 24, alignItems: "center", borderLeft: `10px solid ${C.red}` }}>
        <div style={{ fontSize: 64, scale: coin, rotate: `${(1 - coin) * -40}deg` }}>💳</div>
        <div>
          <div style={{ fontSize: 40, fontWeight: 800, color: C.ink }}>
            Amex · $3,500 at <span style={{ color: C.red }}>20%</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 600, color: C.muted }}>At $200/month, paid off by July 2028</div>
        </div>
        <Shine start={s(7.6)} />
      </Pop>
    </AbsoluteFill>
  );
};
