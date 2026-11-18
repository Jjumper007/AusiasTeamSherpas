import React from "react";
import { AbsoluteFill, Easing, useCurrentFrame } from "remotion";
import { C, FONT, tw, Heading, Pop, cardStyle, Shine, s } from "./comun";

// 7. Investments
const Donut: React.FC<{ x: number; delay: number; stocks: number; title: string; sub: string; highlight?: boolean }> = ({ x, delay, stocks, title, sub, highlight }) => {
  const f = useCurrentFrame();
  const g = tw(f, delay, delay + s(1.4), 0, 1, Easing.out(Easing.cubic));
  const R = 115;
  const circ = 2 * Math.PI * R;
  const id = `dn-${title}`;
  const st = Math.round(stocks * g);
  return (
    <Pop delay={delay} from="scale" style={{ left: x, top: 200, width: 410, height: 560 }}>
      <div style={{ ...cardStyle, position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 30, boxSizing: "border-box", border: highlight ? `5px solid ${C.blue}` : "none", boxShadow: highlight ? `0 0 0 10px ${C.blue}22, 0 26px 50px ${C.blue}44` : cardStyle.boxShadow }}>
        {highlight ? <div style={{ position: "absolute", top: -22, padding: "6px 22px", borderRadius: 30, background: C.blue, color: "#fff", fontSize: 24, fontWeight: 800, letterSpacing: 3 }}>PROPOSED</div> : null}
        <div style={{ fontSize: 38, fontWeight: 800, color: C.ink }}>{title}</div>
        <svg width={300} height={300} viewBox="0 0 300 300">
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={C.cyan} />
              <stop offset="1" stopColor={highlight ? C.purple : C.blue} />
            </linearGradient>
          </defs>
          <circle cx={150} cy={150} r={R} fill="none" stroke={C.blueSoft} strokeWidth={46} />
          <circle cx={150} cy={150} r={R} fill="none" stroke={`url(#${id})`} strokeWidth={46} strokeDasharray={`${circ * (stocks / 100) * g} ${circ}`} transform="rotate(-90 150 150)" />
          <text x={150} y={166} textAnchor="middle" fontSize={52} fontWeight={900} fill={C.ink} fontFamily={FONT}>
            {st}/{100 - st}
          </text>
        </svg>
        <div style={{ fontSize: 28, fontWeight: 600, color: C.muted, textAlign: "center", padding: "0 24px" }}>{sub}</div>
        <Shine start={delay + s(1.3)} />
      </div>
    </Pop>
  );
};
export const SceneInvest: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Heading kicker="INVESTMENTS" title="Solid, with room to tune" />
      {[
        ["13.6% / yr", "last 3 years", C.ink, C.green],
        ["−10.2%", "worst drop · back in 62 days", C.red, C.red],
        ["15.3% / yr", "simple mix, same stock share", C.ink, C.blue],
      ].map(([v, l, col, bar], i) => (
        <Pop key={i} delay={s(0.4 + i * 0.4)} from="left" style={{ left: 60, top: 210 + i * 185, width: 470 }}>
          <div style={{ ...cardStyle, padding: "18px 30px 22px 40px", boxSizing: "border-box", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 12, background: bar }} />
            <div style={{ fontSize: 54, fontWeight: 900, color: col, letterSpacing: -1 }}>{v}</div>
            <div style={{ fontSize: 27, fontWeight: 600, color: C.muted }}>{l}</div>
            <div style={{ position: "absolute", right: 24, top: 28, fontSize: 40, translate: `0px ${Math.sin(f / 12 + i) * 4}px` }}>{i === 1 ? "📉" : "📈"}</div>
          </div>
        </Pop>
      ))}
      <Donut x={590} delay={s(3.2)} stocks={59} title="Current" sub="stocks / bonds & cash" />
      <Donut x={1040} delay={s(4)} stocks={67} title="Proposed" sub="closer to your Growth (4) profile" highlight />
    </AbsoluteFill>
  );
};
