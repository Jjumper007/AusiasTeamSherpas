import React from "react";
import { AbsoluteFill, Easing, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, VW, VH, clamp, ease, tw, useSpring, Heading, Pop, cardStyle, s } from "./comun";

// 7. Investments
const Donut: React.FC<{ x: number; delay: number; stocks: number; title: string; sub: string; highlight?: boolean }> = ({ x, delay, stocks, title, sub, highlight }) => {
  const f = useCurrentFrame();
  const g = tw(f, delay, delay + s(1.2), 0, 1);
  const R = 115;
  const circ = 2 * Math.PI * R;
  return (
    <Pop delay={delay} from="scale" style={{ left: x, top: 200, width: 410, height: 560, ...cardStyle, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 30, boxSizing: "border-box", border: highlight ? `5px solid ${C.blue}` : "none" }}>
      <div style={{ fontSize: 38, fontWeight: 800, color: C.ink }}>{title}</div>
      <svg width={300} height={300} viewBox="0 0 300 300">
        <circle cx={150} cy={150} r={R} fill="none" stroke={C.blueSoft} strokeWidth={46} />
        <circle cx={150} cy={150} r={R} fill="none" stroke={C.blue} strokeWidth={46} strokeDasharray={`${circ * (stocks / 100) * g} ${circ}`} transform="rotate(-90 150 150)" />
        <text x={150} y={166} textAnchor="middle" fontSize={52} fontWeight={900} fill={C.ink} fontFamily={FONT}>{Math.round(stocks * g)}/{100 - Math.round(stocks * g)}</text>
      </svg>
      <div style={{ fontSize: 28, fontWeight: 600, color: C.muted, textAlign: "center", padding: "0 24px" }}>{sub}</div>
    </Pop>
  );
};
export const SceneInvest: React.FC = () => (
  <AbsoluteFill>
    <Heading kicker="INVESTMENTS" title="Solid, with room to tune" />
    {[
      ["13.6% / yr", "last 3 years", C.ink],
      ["−10.2%", "worst drop · back in 62 days", C.red],
      ["15.3% / yr", "simple mix, same stock share", C.ink],
    ].map(([v, l, col], i) => (
      <Pop key={i} delay={s(0.4 + i * 0.4)} from="left" style={{ left: 60, top: 210 + i * 185, width: 470, ...cardStyle, padding: "18px 30px", boxSizing: "border-box" }}>
        <div style={{ fontSize: 54, fontWeight: 900, color: col }}>{v}</div>
        <div style={{ fontSize: 27, fontWeight: 600, color: C.muted }}>{l}</div>
      </Pop>
    ))}
    <Donut x={590} delay={s(3.2)} stocks={59} title="Current" sub="stocks / bonds & cash" />
    <Donut x={1040} delay={s(4)} stocks={67} title="Proposed" sub="closer to your Growth (4) profile" highlight />
  </AbsoluteFill>
);
