import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Check, Landmark, ShieldCheck, TreePalm, TrendingUp } from "lucide-react";
import { C, VW, VH, body, display, tw, expo, Heading, IconTile, Pop, Burst, clamp, s } from "./comun";
import { Flag } from "./Escaladores";

// 9. Closing message. No button (the video is the client's final deliverable): one phrase, the four things we do, and the summit.
const SERVICES = [
  { icon: Landmark, text: "Cash and home plan for January 2027" },
  { icon: TreePalm, text: "A retirement roadmap that lasts to 91" },
  { icon: ShieldCheck, text: "Life and umbrella coverage review" },
  { icon: TrendingUp, text: "A portfolio tuned to your Growth profile" },
];
const RIDGE: [number, number][] = [
  [760, 800],
  [880, 730],
  [960, 760],
  [1090, 610],
  [1170, 640],
  [1290, 470],
  [1390, 300],
];
export const SceneCTA: React.FC = () => {
  const f = useCurrentFrame();
  const draw = tw(f, s(1.2), s(6.2), 0, 1, expo);
  const pts = RIDGE.map((p) => p.join(",")).join(" ");
  const flag = tw(f, s(6), s(6.7), 0, 1);
  const phrase = ["Your", "freedom", "at", "58", "starts", "with", "one", "conversation."];
  return (
    <AbsoluteFill>
      <Heading title="Let's put your plan to work" />
      <svg width={VW} height={VH} style={{ position: "absolute", overflow: "visible" }}>
        <polyline points={pts} fill="none" stroke={C.blueLine} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={pts} fill="none" stroke={C.blue} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${draw} 1`} />
        {RIDGE.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={7} fill="#fff" stroke={C.blue} strokeWidth={3} opacity={draw > i / (RIDGE.length - 1) ? 1 : 0} />
        ))}
      </svg>
      <div style={{ position: "absolute", left: 1390, top: 300 - 150, opacity: flag, scale: 0.7 + 0.3 * flag, transformOrigin: "0 100%" }}>
        <Flag height={150} color={C.blue} label="58" />
      </div>
      <Burst start={s(6.2)} x={1392} y={300} colors={[C.blue, C.lavender, C.sky]} count={16} power={220} />

      <div style={{ position: "absolute", left: 70, top: 200, width: 700, display: "flex", flexWrap: "wrap", columnGap: 20, rowGap: 0 }}>
        {phrase.map((w, i) => {
          const p = tw(f, s(0.3) + i * 4, s(0.3) + i * 4 + 14, 0, 1, expo);
          const accent = i === 3;
          return (
            <span key={i} style={{ overflow: "hidden", display: "inline-block", paddingBottom: 10, marginBottom: -10 }}>
              <span style={{ ...display(78, accent ? C.blue : C.ink, { letterSpacing: "-0.03em" }), display: "inline-block", translate: `0px ${(1 - p) * 105}%` }}>{w}</span>
            </span>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 70, top: 520, width: 640 }}>
        {SERVICES.map((sv, i) => {
          const a = s(2.2 + i * 0.35);
          const p = tw(f, a, a + 12, 0, 1, expo);
          const tick = tw(f, a + 8, a + 18, 0, 1);
          return (
            <div key={sv.text} style={{ display: "flex", alignItems: "center", gap: 20, height: 74, borderTop: `1.5px solid ${C.hairline}`, opacity: p, translate: `${(1 - p) * -40}px 0px` }}>
              <IconTile icon={sv.icon} size={46} />
              <div style={{ ...body(28, C.ink, 500), flex: 1 }}>{sv.text}</div>
              <div style={{ width: 30, height: 30, borderRadius: 15, background: C.success, display: "flex", alignItems: "center", justifyContent: "center", scale: tick }}>
                <Check size={19} strokeWidth={2.75} color="#fff" />
              </div>
            </div>
          );
        })}
        <div style={{ borderTop: `1.5px solid ${C.hairline}` }} />
      </div>
      <div style={{ position: "absolute", left: 200, top: 842, width: 1230, ...body(18, C.ink3, 400), opacity: interpolate(f, [s(2), s(3)], [0, 1], clamp) }}>
        Projections are hypothetical. Discussion points to review with your advisor, not individual investment advice.
      </div>
    </AbsoluteFill>
  );
};
