import React from "react";
import { AbsoluteFill, Easing, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, VW, VH, clamp, ease, tw, useSpring, Heading, Pop, cardStyle, s } from "./comun";

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
  const cursorP = tw(f, s(4.2), clickF, 0, 1, Easing.inOut(Easing.cubic));
  const press = f >= clickF && f < clickF + 6 ? 0.94 : 1;
  const ripple = interpolate(f, [clickF, clickF + 20], [0, 1], clamp);
  const pulse = 1 + Math.max(0, Math.sin((f - s(3.6)) / 8)) * 0.03;
  const BX = 430;
  const BY = 640;
  return (
    <AbsoluteFill>
      <Heading kicker="YOUR NEXT STEP" title="Let's put your plan to work" />
      {SERVICES.map((sv, i) => (
        <Pop key={sv} delay={s(0.4 + i * 0.35)} from="left" style={{ left: 70 + (i % 2) * 700, top: 250 + Math.floor(i / 2) * 140, display: "flex", alignItems: "center", gap: 22 }}>
          <div style={{ width: 64, height: 64, borderRadius: 32, background: C.green, color: "#fff", fontSize: 38, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>✓</div>
          <div style={{ fontSize: 30, fontWeight: 700, color: C.ink, width: 540, lineHeight: 1.2 }}>{sv}</div>
        </Pop>
      ))}
      {/* button */}
      <div style={{ position: "absolute", left: BX, top: BY, width: 640, height: 150, opacity: Math.min(1, btn), scale: interpolate(btn, [0, 1], [0.4, 1]) * pulse * press }}>
        <div style={{ position: "absolute", inset: -24 * ripple, borderRadius: 90, border: `6px solid ${C.blue}`, opacity: 1 - ripple }} />
        <div style={{ position: "absolute", inset: 0, borderRadius: 80, background: `linear-gradient(90deg, ${C.blue}, ${C.purple})`, boxShadow: "0 18px 40px rgba(59,125,221,0.45)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 50, fontWeight: 900 }}>
          Book your plan review →
        </div>
      </div>
      <Pop delay={s(3.9)} from="up" style={{ left: 70, width: 1360, top: 545, textAlign: "center", fontSize: 32, fontWeight: 700, color: C.blue }}>
        Bring your questions. We decide together.
      </Pop>
      {/* cursor */}
      <svg width={70} height={80} viewBox="0 0 70 80" style={{ position: "absolute", left: interpolate(cursorP, [0, 1], [1460, BX + 420]), top: interpolate(cursorP, [0, 1], [860, BY + 90]), opacity: f > s(4.1) ? 1 : 0, scale: press < 1 ? 0.9 : 1 }}>
        <path d="M6 4 L6 62 L22 48 L34 74 L46 68 L34 42 L56 42 Z" fill="#FFFFFF" stroke={C.ink} strokeWidth={5} strokeLinejoin="round" />
      </svg>
      <div style={{ position: "absolute", left: 70, top: 840, width: 1360, textAlign: "center", fontSize: 19, color: C.muted, opacity: tw(f, s(2), s(3), 0, 1) }}>
        Projections are hypothetical. Discussion points to review with your advisor, not individual investment advice.
      </div>
    </AbsoluteFill>
  );
};
