import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Backpack } from "lucide-react";
import { C, body, display, figure, tw, Heading, Pop, s } from "./comun";
import { Climber } from "./Escaladores";

// 3. Cash flow. Metaphor: one porter, one pack, five loads, and a weight limit of $180,000.
const PX_PER_K = 3.1;
const BASE = 810;
const FLOWS = [
  { label: "Taxes", k: 40.664, color: C.chartTaxes, text: "#FFFFFF" },
  { label: "Rent", k: 34.272, color: C.chartRent, text: "#FFFFFF" },
  { label: "Living", k: 66, color: C.chartLiving, text: C.ink },
  { label: "Debt", k: 11.4, color: C.chartDebt, text: "#FFFFFF" },
  { label: "Savings", k: 36, color: C.chartSavings, text: "#FFFFFF" },
];
const LIMIT = 180;
const STACK_X = 640;
const STACK_W = 250;

export const SceneCashFlow: React.FC = () => {
  const f = useCurrentFrame();
  const limitY = BASE - LIMIT * PX_PER_K;
  const limitIn = tw(f, s(0.5), s(1.4), 0, 1);
  const over = tw(f, s(6.8), s(7.6), 0, 1, Easing.out(Easing.back(2)));
  const shake = f > s(7) && f < s(8.4) ? Math.sin(f * 2.4) * 7 * (1 - (f - s(7)) / s(1.4)) : 0;
  const pulse = f > s(7.6) ? 0.5 + 0.5 * Math.sin((f - s(7.6)) / 5) : 0;
  // load carried by the porter grows as crates land
  let acc = 0;
  const landed = FLOWS.map((fl, i) => tw(f, s(2 + i * 0.8), s(2 + i * 0.8) + 14, 0, 1, Easing.out(Easing.bounce)));
  const loadNow = FLOWS.reduce((a, fl, i) => a + fl.k * (f >= s(2 + i * 0.8) ? 1 : 0), 0) / 188.336;
  const lean = 4 + loadNow * 20 + Math.sin(f / 8) * loadNow * 1.4;
  return (
    <AbsoluteFill>
      <Heading title="One income, five jobs" />
      {/* the porter */}
      <div style={{ position: "absolute", left: 90, top: 330, width: 330, height: 440, translate: `${shake * 0.4}px ${loadNow * 8}px` }}>
        <Climber phase={f * 0.16} jacket={C.blue} hat={C.sky} moving={0.25} lean={lean} load={loadNow} pole={false} />
      </div>
      <div style={{ position: "absolute", left: 90, top: 250, display: "flex", alignItems: "center", gap: 14, opacity: limitIn }}>
        <Backpack size={44} strokeWidth={1.75} color={C.blue} />
        <div style={body(34, C.ink2, 500)}>One pack: <span style={{ color: C.blue, fontWeight: 600 }}>$180,000 / yr</span></div>
      </div>
      {/* capacity line */}
      <div style={{ position: "absolute", left: STACK_X - 40, top: limitY - 3, width: tw(f, s(0.5), s(1.4), 0, STACK_W + 520), height: 6, background: C.blue, borderRadius: 3 }} />
      <div style={{ position: "absolute", left: STACK_X + STACK_W + 60, top: limitY - 50, padding: "6px 18px", borderRadius: 12, background: C.blue, ...body(28, "#fff", 600), opacity: limitIn }}>Limit: $180K</div>
      {/* the stack */}
      <div style={{ position: "absolute", left: STACK_X, top: 0, translate: `${shake}px 0px` }}>
        {FLOWS.map((fl, i) => {
          const h = fl.k * PX_PER_K;
          const bottom = acc * PX_PER_K;
          acc += fl.k;
          const drop = (1 - landed[i]) * -380;
          const top = BASE - bottom - h;
          return (
            <div key={fl.label} style={{ position: "absolute", left: 0, top: top + drop, width: STACK_W, height: h - 3, background: fl.color, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", opacity: landed[i] > 0 ? 1 : 0, border: "3px solid rgba(255,255,255,0.55)", boxSizing: "border-box" }}>
              {h > 30 ? <div style={{ ...body(28, fl.text, 600), whiteSpace: "nowrap" }}>{fl.label}</div> : null}
            </div>
          );
        })}
        {/* overflow above the limit */}
        <div style={{ position: "absolute", left: -10, top: BASE - 188.336 * PX_PER_K - 8, width: STACK_W + 20, height: (188.336 - LIMIT) * PX_PER_K + 14, border: `5px solid ${C.error}`, borderRadius: 14, opacity: over, scale: interpolate(over, [0, 1], [1.6, 1]), boxShadow: `0 0 ${14 + pulse * 26}px ${C.error}99` }} />
      </div>
      {/* legend */}
      <div style={{ position: "absolute", left: STACK_X + STACK_W + 60, top: 300, display: "flex", flexDirection: "column", gap: 20 }}>
        {FLOWS.slice()
          .reverse()
          .map((fl, i) => {
            const idx = FLOWS.length - 1 - i;
            const a = tw(f, s(2 + idx * 0.8) + 4, s(2 + idx * 0.8) + 16, 0, 1);
            return (
              <div key={fl.label} style={{ display: "flex", alignItems: "center", gap: 16, opacity: a, translate: `${(1 - a) * 30}px 0px` }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: fl.color }} />
                <div style={body(32, C.ink, 500)}>{fl.label}</div>
                <div style={{ ...figure(36, C.ink), marginLeft: "auto" }}>${Math.round(fl.k * 1000).toLocaleString("en-US")}</div>
              </div>
            );
          })}
      </div>
      <Pop delay={s(7.2)} from="scale" style={{ left: STACK_X + STACK_W + 60, top: 660 }}>
        <div style={{ ...figure(70, C.error), padding: "16px 34px", borderRadius: 24, background: "#FDEAEA", border: `3px solid ${C.error}` }}>−$8,336 / yr</div>
      </Pop>
      <div style={{ position: "absolute", left: STACK_X + STACK_W + 60, top: 790, opacity: tw(f, s(8), s(8.6), 0, 1), ...body(28, C.ink2, 500) }}>More weight than the pack can hold</div>
      <div style={{ ...display(1), display: "none" }} />
    </AbsoluteFill>
  );
};
