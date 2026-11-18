import React from "react";
import { AbsoluteFill, Easing, useCurrentFrame } from "remotion";
import { Check } from "lucide-react";
import { C, VW, VH, body, cardStyle, display, tw, Heading, Pop, Burst, s } from "./comun";
import { ease } from "./comun";
import { RopeTeam, Tent } from "./Escaladores";

// 8. Order. Metaphor: the route up the mountain in three camps, climbed in order.
const CAMPS = [
  { title: "Cash cushion", sub: "+$16,530 to reach 5 months", color: C.blue, x: 250, y: 700 },
  { title: "Clear the 20% card", sub: "$3,500 balance", color: C.chartDebt, x: 750, y: 610 },
  { title: "Add to retirement", sub: "401(k) room $7,500 · Roth IRA up to $4,500", color: C.chartSavings, x: 1250, y: 520 },
];
export const SceneOrder: React.FC = () => {
  const f = useCurrentFrame();
  const t0 = s(3.3);
  const reach = (i: number) => t0 + i * s(0.9);
  // walking position along the camps, with pauses at each one
  const seg = (a: number, b: number, p: number) => a + (b - a) * p;
  const p1 = tw(f, reach(0), reach(1), 0, 1, Easing.inOut(Easing.quad));
  const p2 = tw(f, reach(1), reach(2), 0, 1, Easing.inOut(Easing.quad));
  const stage = f < reach(0) ? 0 : f < reach(1) ? 1 : 2;
  const px = stage === 0 ? CAMPS[0].x - 150 + tw(f, s(2), reach(0), 0, 150) : stage === 1 ? seg(CAMPS[0].x, CAMPS[1].x, p1) : seg(CAMPS[1].x, CAMPS[2].x, p2);
  const py = stage === 0 ? CAMPS[0].y : stage === 1 ? seg(CAMPS[0].y, CAMPS[1].y, p1) : seg(CAMPS[1].y, CAMPS[2].y, p2);
  const walking = (stage === 1 && p1 < 1) || (stage === 2 && p2 < 1) || f < reach(0);
  const trail = tw(f, s(2.6), s(6), 0, 1, Easing.inOut(Easing.quad));
  const shuffle = (i: number) => (f < s(3.2) ? Math.sin(f / 4 + i * 2) * 10 : 0);
  return (
    <AbsoluteFill>
      <Heading title="Order matters" />
      <svg width={VW} height={VH} style={{ position: "absolute" }}>
        <path d="M70 840 L420 640 L640 700 L980 560 L1160 600 L1480 430 L1500 900 L70 900 Z" fill={C.blueWash} />
        <path d={`M ${CAMPS[0].x} ${CAMPS[0].y} Q ${(CAMPS[0].x + CAMPS[1].x) / 2} ${CAMPS[0].y + 40} ${CAMPS[1].x} ${CAMPS[1].y} T ${CAMPS[2].x} ${CAMPS[2].y}`} fill="none" stroke={C.blueLine} strokeWidth={8} strokeDasharray="2 18" strokeLinecap="round" pathLength={1} strokeDashoffset={0} opacity={trail} />
      </svg>
      {CAMPS.map((c, i) => {
        const hit = f >= reach(i);
        const k = hit ? 1 + 0.25 * Math.max(0, 1 - (f - reach(i)) / 12) : 1;
        return (
          <React.Fragment key={c.title}>
            <Pop delay={s(0.3 + i * 0.25)} from="up" style={{ left: c.x - 215, top: 140 + i * 0 + (i === 0 ? 215 : i === 1 ? 140 : 70) + shuffle(i) - 20, width: 430 }}>
              <div style={{ ...cardStyle, padding: "22px 26px", boxSizing: "border-box", borderTop: `10px solid ${c.color}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 32, background: c.color, ...display(36, "#fff"), display: "flex", alignItems: "center", justifyContent: "center", scale: k }}>{hit ? i + 1 : "?"}</div>
                  <div style={display(34)}>{c.title}</div>
                </div>
                <div style={{ ...body(27, C.ink2, 500), marginTop: 10 }}>{c.sub}</div>
              </div>
            </Pop>
            <div style={{ position: "absolute", left: c.x - 56, top: c.y - 30, opacity: tw(f, s(0.8 + i * 0.3), s(1.4 + i * 0.3), 0, 1) }}>
              <Tent width={112} color={c.color} />
            </div>
            {hit ? (
              <div style={{ position: "absolute", left: c.x + 40, top: c.y - 62, width: 44, height: 44, borderRadius: 22, background: C.success, display: "flex", alignItems: "center", justifyContent: "center", scale: tw(f, reach(i), reach(i) + 10, 0, 1, ease) }}>
                <Check size={28} strokeWidth={2.5} color="#fff" />
              </div>
            ) : null}
            <Burst start={reach(i)} x={c.x} y={c.y - 30} colors={[c.color, C.gold]} count={10} power={90} />
          </React.Fragment>
        );
      })}
      <div style={{ position: "absolute", left: px - 78, top: py - 116, opacity: tw(f, s(1.6), s(2.2), 0, 1) }}>
        <RopeTeam phase={f * 0.42} width={62} moving={walking ? 1 : 0.1} lean={stage === 0 ? 4 : 12} />
      </div>
      <Pop delay={s(6.4)} from="up" style={{ left: 70, top: 168, ...body(36, C.blue, 600) }}>
        We'll test this sequence with you, step by step.
      </Pop>
    </AbsoluteFill>
  );
};
