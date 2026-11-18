import React from "react";
import { AbsoluteFill, Easing, useCurrentFrame } from "remotion";
import { Mountain, ShieldCheck } from "lucide-react";
import { C, FONT_DISPLAY, body, cardStyle, display, figure, tw, Heading, Pop, s } from "./comun";
import { Climber } from "./Escaladores";

// 7. Investments. Metaphor: a slip on the slope and the recovery (−10.2%, back in 62 days), and the mix as engine vs safety rope.
const Donut: React.FC<{ x: number; delay: number; stocks: number; title: string; sub: string; highlight?: boolean }> = ({ x, delay, stocks, title, sub, highlight }) => {
  const f = useCurrentFrame();
  const g = tw(f, delay, delay + s(1.4), 0, 1, Easing.out(Easing.cubic));
  const R = 105;
  const circ = 2 * Math.PI * R;
  const st = Math.round(stocks * g);
  return (
    <Pop delay={delay} from="scale" style={{ left: x, top: 190, width: 420, height: 560 }}>
      <div style={{ ...cardStyle, position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 26, boxSizing: "border-box", border: highlight ? `4px solid ${C.blue}` : `2px solid ${C.hairline}` }}>
        <div style={display(40)}>{title}</div>
        <svg width={290} height={290} viewBox="0 0 300 300">
          <circle cx={150} cy={150} r={R} fill="none" stroke={C.blueWash} strokeWidth={46} />
          <circle cx={150} cy={150} r={R} fill="none" stroke={highlight ? C.blue : C.blueLine} strokeWidth={46} strokeDasharray={`${circ * (stocks / 100) * g} ${circ}`} transform="rotate(-90 150 150)" />
          <text x={150} y={166} textAnchor="middle" fontSize={50} fontWeight={600} fill={C.ink} fontFamily={FONT_DISPLAY} letterSpacing="-0.035em">
            {st}/{100 - st}
          </text>
        </svg>
        <div style={{ display: "flex", gap: 22, ...body(26, C.ink2, 500), marginTop: 6 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Mountain size={26} strokeWidth={1.75} color={C.blue} /> Stocks
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ShieldCheck size={26} strokeWidth={1.75} color={C.ink2} /> Bonds & cash
          </span>
        </div>
        <div style={{ ...body(28, C.ink2, 500), textAlign: "center", padding: "10px 24px 0" }}>{sub}</div>
      </div>
    </Pop>
  );
};

export const SceneInvest: React.FC = () => {
  const f = useCurrentFrame();
  // the slip: a short ridge with a dip, and the climber crossing it
  const MX = 60;
  const MY = 640;
  const MW = 470;
  const prog = tw(f, s(1.6), s(5.6), 0, 1, Easing.inOut(Easing.quad));
  const yAt = (t: number) => MY - 90 * t + (t > 0.38 && t < 0.62 ? 60 * Math.sin(Math.PI * ((t - 0.38) / 0.24)) : 0);
  const pts = Array.from({ length: 41 }, (_, i) => `${MX + (i / 40) * MW},${yAt(i / 40) + 0}`).join(" ");
  const cx = MX + prog * MW;
  const cy = yAt(prog) - 6;
  return (
    <AbsoluteFill>
      <Heading title="Solid, with room to tune" />
      {[
        ["13.6% / yr", "last 3 years", C.ink],
        ["15.3% / yr", "simple mix, same stock share", C.ink],
      ].map(([v, l, col], i) => (
        <Pop key={i} delay={s(0.4 + i * 0.4)} from="left" style={{ left: 60, top: 190 + i * 168, width: 470 }}>
          <div style={{ ...cardStyle, padding: "18px 30px 20px 36px", boxSizing: "border-box", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 12, background: i === 0 ? C.success : C.blue }} />
            <div style={figure(58, col)}>{v}</div>
            <div style={body(27, C.ink2, 500)}>{l}</div>
          </div>
        </Pop>
      ))}
      {/* the slip and the recovery */}
      <Pop delay={s(1.2)} from="up" style={{ left: 60, top: 530, width: 470, height: 300 }}>
        <div style={{ ...cardStyle, position: "absolute", inset: 0 }} />
      </Pop>
      <svg width={600} height={900} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: tw(f, s(1.4), s(2), 0, 1) }}>
        <polyline points={pts} fill="none" stroke={C.blueLine} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={Array.from({ length: Math.round(prog * 40) + 1 }, (_, i) => `${MX + (i / 40) * MW},${yAt(i / 40)}`).join(" ")} fill="none" stroke={prog > 0.38 && prog < 0.62 ? C.error : C.blue} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div style={{ position: "absolute", left: cx - 40, top: cy - 90, width: 80, height: 107, opacity: tw(f, s(1.4), s(2), 0, 1) }}>
        <Climber phase={f * 0.35} jacket={C.blue} hat={C.sky} moving={prog > 0 && prog < 1 ? 1 : 0.1} lean={prog > 0.38 && prog < 0.62 ? 18 : 6} pole={false} />
      </div>
      <Pop delay={s(3.2)} from="scale" style={{ left: 190, top: 700, width: 330 }}>
        <div style={{ ...figure(54, C.error), whiteSpace: "nowrap" }}>
          −10.2%
          <div style={{ ...body(26, C.ink2, 500), letterSpacing: 0, marginTop: 6 }}>worst drop · back in 62 days</div>
        </div>
      </Pop>
      <Donut x={600} delay={s(3.2)} stocks={59} title="Current" sub="stocks / bonds & cash" />
      <Donut x={1040} delay={s(4)} stocks={67} title="Proposed" sub="closer to your Growth profile" highlight />
    </AbsoluteFill>
  );
};
