import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { C, tw, Heading, Pop, s } from "./comun";

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
  const over = tw(f, s(6.8), s(7.6), 0, 1, Easing.out(Easing.back(2)));
  const shake = f > s(7) && f < s(8.2) ? Math.sin(f * 2.4) * 8 * (1 - (f - s(7)) / s(1.2)) : 0;
  const pulse = f > s(7.6) ? 0.5 + 0.5 * Math.sin((f - s(7.6)) / 5) : 0;
  let acc = 0;
  return (
    <AbsoluteFill>
      <Heading kicker="CASH FLOW" title="One income, five jobs" />
      <div style={{ position: "absolute", left: X0, top: 218, fontSize: 38, fontWeight: 800, color: C.ink, opacity: inc, translate: `${(1 - inc) * -40}px 0px` }}>
        Income · <span style={{ color: C.blue }}>${Math.round(180000 * inc).toLocaleString("en-US")}</span> / yr
      </div>
      <div style={{ position: "absolute", left: X0, top: 275, width: 180 * PX_PER_K * inc, height: 100, borderRadius: 18, background: `linear-gradient(90deg, ${C.blueSoft}, #BFD6F7)`, border: `5px solid ${C.blue}`, boxSizing: "border-box", boxShadow: "0 14px 26px rgba(59,125,221,0.25)", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, bottom: 0, width: 140, left: ((f * 9) % 1700) - 200, background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.7), rgba(255,255,255,0))", rotate: "16deg", scale: "1 2" }} />
      </div>
      <div style={{ position: "absolute", left: X0, top: 430, fontSize: 38, fontWeight: 800, color: C.ink, opacity: tw(f, s(3), s(3.6), 0, 1) }}>Where it goes</div>
      <div style={{ position: "absolute", left: X0, top: 485, height: 100, translate: `${shake}px 0px`, filter: "drop-shadow(0 14px 14px rgba(31,35,64,0.18))" }}>
        {FLOWS.map((fl, i) => {
          const st = s(3.3 + i * 0.55);
          const w = tw(f, st, st + s(0.5), 0, fl.k * PX_PER_K);
          const left = acc * PX_PER_K;
          acc += fl.k;
          const small = fl.k < 20;
          return (
            <div key={fl.label} style={{ position: "absolute", left, top: 0, width: w, height: 100, background: `linear-gradient(180deg, ${fl.color}, ${fl.color}D0)`, borderRight: "4px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: i === 0 ? "18px 0 0 18px" : i === FLOWS.length - 1 ? "0 18px 18px 0" : 0 }}>
              <div style={{ fontSize: small ? 22 : 30, fontWeight: 800, color: fl.color === C.yellow ? C.ink : "#fff", whiteSpace: "nowrap", textAlign: "center", lineHeight: 1.1, opacity: w > 50 ? 1 : 0 }}>
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
      {/* limit marker */}
      <div style={{ position: "absolute", left: limitX - 3, top: 255, width: 6, height: tw(f, s(6.2), s(6.8), 0, 350), background: C.blue, borderRadius: 3 }} />
      <div style={{ position: "absolute", left: limitX - 70, top: 215, padding: "6px 16px", borderRadius: 12, background: C.blue, color: "#fff", fontSize: 26, fontWeight: 800, opacity: tw(f, s(6.5), s(7), 0, 1) }}>$180K limit</div>
      <div style={{ position: "absolute", left: limitX, top: 477, width: (total - 180) * PX_PER_K + 8, height: 116, border: `6px solid ${C.red}`, borderRadius: 16, opacity: over, scale: interpolate(over, [0, 1], [1.8, 1]), boxShadow: `0 0 ${20 + pulse * 30}px ${C.red}88`, background: "repeating-linear-gradient(45deg, rgba(238,75,85,0.18) 0 12px, rgba(238,75,85,0) 12px 24px)" }} />
      <Pop delay={s(7.2)} from="scale" style={{ left: limitX - 280, top: 650, padding: "18px 40px", borderRadius: 24, background: C.redSoft, color: C.red, fontSize: 64, fontWeight: 900, boxShadow: "0 16px 30px rgba(238,75,85,0.3)", border: `4px solid ${C.red}` }}>
        −$8,336 / yr
      </Pop>
    </AbsoluteFill>
  );
};
