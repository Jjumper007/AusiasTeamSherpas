import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { C, clamp, tw, useSpring, Heading, Pop, Burst, easeInOut, s } from "./comun";

// 9. Call to action
const SERVICES = [
  "Cash & home plan for January 2027",
  "Retirement roadmap that lasts to 91",
  "Life & umbrella coverage review",
  "Portfolio tuned to your Growth profile",
];
export const SceneCTA: React.FC = () => {
  const f = useCurrentFrame();
  const btn = useSpring(s(3.6), 11);
  const clickF = s(5.4);
  const cursorP = tw(f, s(4.2), clickF, 0, 1, easeInOut);
  const press = f >= clickF && f < clickF + 6 ? 0.94 : 1;
  const ripple = interpolate(f, [clickF, clickF + 22], [0, 1], clamp);
  const pulse = 1 + Math.max(0, Math.sin((f - s(3.6)) / 8)) * 0.03;
  const BX = 430;
  const BY = 640;
  return (
    <AbsoluteFill>
      <Heading kicker="YOUR NEXT STEP" title="Let's put your plan to work" />
      {SERVICES.map((sv, i) => (
        <Pop key={sv} delay={s(0.4 + i * 0.35)} from="left" style={{ left: 70 + (i % 2) * 700, top: 250 + Math.floor(i / 2) * 140, display: "flex", alignItems: "center", gap: 22 }}>
          <div style={{ width: 66, height: 66, borderRadius: 33, background: `linear-gradient(145deg, ${C.green}, #17A07A)`, color: "#fff", fontSize: 38, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 18px rgba(31,181,138,0.4)", scale: tw(f, s(0.9 + i * 0.35), s(0.9 + i * 0.35) + 14, 0.2, 1, Easing.out(Easing.back(3))) }}>✓</div>
          <div style={{ fontSize: 31, fontWeight: 700, color: C.ink, width: 540, lineHeight: 1.2 }}>{sv}</div>
        </Pop>
      ))}
      <div style={{ position: "absolute", left: BX, top: BY, width: 640, height: 150, opacity: Math.min(1, btn), scale: interpolate(btn, [0, 1], [0.4, 1]) * pulse * press }}>
        <div style={{ position: "absolute", inset: -30 * ripple, borderRadius: 100, border: `6px solid ${C.blue}`, opacity: 1 - ripple }} />
        <div style={{ position: "absolute", inset: 0, borderRadius: 80, background: `linear-gradient(90deg, ${C.blue}, ${C.purple})`, boxShadow: "0 22px 46px rgba(59,125,221,0.5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 50, fontWeight: 900, overflow: "hidden" }}>
          Book your plan review →
          <div style={{ position: "absolute", top: -20, bottom: -20, width: 100, left: ((f * 7) % 1100) - 250, rotate: "18deg", background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.35), rgba(255,255,255,0))" }} />
        </div>
      </div>
      <Pop delay={s(3.9)} from="up" style={{ left: 70, width: 1360, top: 545, textAlign: "center", fontSize: 34, fontWeight: 800, color: C.blue }}>
        Bring your questions. We decide together.
      </Pop>
      <Burst start={clickF} x={BX + 320} y={BY + 75} count={30} power={300} />
      <svg width={70} height={80} viewBox="0 0 70 80" style={{ position: "absolute", left: interpolate(cursorP, [0, 1], [1460, BX + 420]), top: interpolate(cursorP, [0, 1], [860, BY + 90]), opacity: f > s(4.1) ? 1 : 0, scale: press < 1 ? 0.9 : 1, filter: "drop-shadow(0 8px 8px rgba(0,0,0,0.3))" }}>
        <path d="M6 4 L6 62 L22 48 L34 74 L46 68 L34 42 L56 42 Z" fill="#FFFFFF" stroke={C.ink} strokeWidth={5} strokeLinejoin="round" />
      </svg>
      <div style={{ position: "absolute", left: 70, top: 840, width: 1360, textAlign: "center", fontSize: 19, color: C.muted, opacity: tw(f, s(2), s(3), 0, 1) }}>
        Projections are hypothetical. Discussion points to review with your advisor, not individual investment advice.
      </div>
    </AbsoluteFill>
  );
};
