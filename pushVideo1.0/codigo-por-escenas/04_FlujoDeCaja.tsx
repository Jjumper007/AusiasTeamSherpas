import React from "react";
import { AbsoluteFill, Easing, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, VW, VH, clamp, ease, tw, useSpring, Heading, Pop, cardStyle, s } from "./comun";

// 3. Cash flow
const PX_PER_K = 6.6;
const FLOWS = [
  { label: "Taxes", k: 40.7, color: "#8C93B8" },
  { label: "Rent", k: 34.3, color: C.orange },
  { label: "Living", k: 66, color: C.yellow },
  { label: "Debt", k: 11.4, color: C.red },
  { label: "Savings", k: 36, color: C.green },
];
export const SceneCashFlow: React.FC = () => {
  const f = useCurrentFrame();
  const X0 = 80;
  const inc = tw(f, s(0.5), s(1.5), 0, 1);
  const total = FLOWS.reduce((a, b) => a + b.k, 0);
  const limitX = X0 + 180 * PX_PER_K;
  const over = tw(f, s(6.8), s(7.6), 0, 1);
  const shake = f > s(7) && f < s(8) ? Math.sin(f * 2.2) * 7 * (1 - (f - s(7)) / s(1)) : 0;
  let acc = 0;
  return (
    <AbsoluteFill>
      <Heading kicker="CASH FLOW" title="One income, five jobs" />
      <div style={{ position: "absolute", left: X0, top: 220, fontSize: 38, fontWeight: 700, color: C.ink, opacity: inc }}>Income · $180,000 / yr</div>
      <div style={{ position: "absolute", left: X0, top: 275, width: 180 * PX_PER_K * inc, height: 100, borderRadius: 16, background: C.blueSoft, border: `5px solid ${C.blue}`, boxSizing: "border-box" }} />
      <div style={{ position: "absolute", left: X0, top: 430, fontSize: 38, fontWeight: 700, color: C.ink, opacity: tw(f, s(3), s(3.6), 0, 1) }}>Where it goes</div>
      <div style={{ position: "absolute", left: X0, top: 485, height: 100, translate: `${shake}px 0px` }}>
        {FLOWS.map((fl, i) => {
          const st = s(3.3 + i * 0.55);
          const w = tw(f, st, st + s(0.5), 0, fl.k * PX_PER_K);
          const left = acc * PX_PER_K;
          acc += fl.k;
          const small = fl.k < 20;
          return (
            <div key={fl.label} style={{ position: "absolute", left, top: 0, width: w, height: 100, background: fl.color, borderRight: "4px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: i === 0 ? "16px 0 0 16px" : i === FLOWS.length - 1 ? "0 16px 16px 0" : 0 }}>
              <div style={{ fontSize: small ? 22 : 30, fontWeight: 800, color: "#fff", whiteSpace: "nowrap", textAlign: "center", lineHeight: 1.1, opacity: w > 50 ? 1 : 0 }}>
                {small ? (
                  <>
                    {fl.label}
                    <br />${Math.round(fl.k)}K
                  </>
                ) : (
                  `${fl.label} $${Math.round(fl.k)}K`
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: limitX - 3, top: 260, width: 6, height: tw(f, s(6.2), s(6.8), 0, 345), background: C.blue, borderRadius: 3 }} />
      <div style={{ position: "absolute", left: limitX, top: 477, width: (total - 180) * PX_PER_K + 8, height: 116, border: `6px solid ${C.red}`, borderRadius: 14, opacity: over, scale: interpolate(over, [0, 1], [1.8, 1]) }} />
      <Pop delay={s(7.2)} from="scale" style={{ left: limitX - 260, top: 650, padding: "18px 38px", borderRadius: 20, background: C.redSoft, color: C.red, fontSize: 60, fontWeight: 900 }}>
        −$8,336 / yr
      </Pop>
    </AbsoluteFill>
  );
};
