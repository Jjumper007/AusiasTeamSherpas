import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Check, Compass, Landmark, ShieldCheck, TreePalm, TrendingUp } from "lucide-react";
import { C, CTA_GRADIENT, FONT_DISPLAY, body, clamp, tw, useSpring, Heading, IconTile, Pop, Burst, easeInOut, s } from "./comun";

// 9. Call to action: one primary action per screen, the lavender-to-blue pill (DESIGN.md).
const SERVICES = [
  { icon: Landmark, text: "Cash & home plan for January 2027" },
  { icon: TreePalm, text: "Retirement roadmap that lasts to 91" },
  { icon: ShieldCheck, text: "Life & umbrella coverage review" },
  { icon: TrendingUp, text: "Portfolio tuned to your Growth profile" },
];
export const SceneCTA: React.FC = () => {
  const f = useCurrentFrame();
  const btn = useSpring(s(3.6), 11);
  const clickF = s(5.4);
  const cursorP = tw(f, s(4.2), clickF, 0, 1, easeInOut);
  const press = f >= clickF && f < clickF + 6 ? 0.94 : 1;
  const ripple = interpolate(f, [clickF, clickF + 22], [0, 1], clamp);
  const pulse = 1 + Math.max(0, Math.sin((f - s(3.6)) / 8)) * 0.03;
  const BX = 410;
  const BY = 640;
  return (
    <AbsoluteFill>
      <Heading title="Let's put your plan to work" />
      {SERVICES.map((sv, i) => (
        <Pop key={sv.text} delay={s(0.4 + i * 0.35)} from="left" style={{ left: 70 + (i % 2) * 700, top: 230 + Math.floor(i / 2) * 150, display: "flex", alignItems: "center", gap: 22 }}>
          <IconTile icon={sv.icon} size={76} />
          <div style={{ ...body(31, C.ink, 600), width: 540, lineHeight: 1.2 }}>{sv.text}</div>
          <div style={{ position: "absolute", left: 52, top: -8, width: 34, height: 34, borderRadius: 17, background: C.success, display: "flex", alignItems: "center", justifyContent: "center", scale: tw(f, s(0.9 + i * 0.35), s(0.9 + i * 0.35) + 14, 0, 1, Easing.out(Easing.back(3))) }}>
            <Check size={22} strokeWidth={2.75} color="#fff" />
          </div>
        </Pop>
      ))}
      <Pop delay={s(3.2)} from="up" style={{ left: 70, width: 1360, top: 535, textAlign: "center", display: "flex", justifyContent: "center", alignItems: "center", gap: 14, ...body(34, C.blue, 600) }}>
        <Compass size={38} strokeWidth={1.75} color={C.blue} />
        Bring your questions. We decide together.
      </Pop>
      <div style={{ position: "absolute", left: BX, top: BY, width: 680, height: 150, opacity: Math.min(1, btn), scale: interpolate(btn, [0, 1], [0.4, 1]) * pulse * press }}>
        <div style={{ position: "absolute", inset: -30 * ripple, borderRadius: 100, border: `6px solid ${C.blueBright}`, opacity: 1 - ripple }} />
        <div style={{ position: "absolute", inset: 0, borderRadius: 80, background: CTA_GRADIENT, boxShadow: "inset 0 2px 4px 0 #B8C1E6, 0 22px 44px rgba(69,101,214,0.45)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 52, letterSpacing: "-0.02em" }}>
          Book your plan review →
        </div>
      </div>
      <Burst start={clickF} x={BX + 340} y={BY + 75} count={30} power={300} />
      <svg width={70} height={80} viewBox="0 0 70 80" style={{ position: "absolute", left: interpolate(cursorP, [0, 1], [1460, BX + 450]), top: interpolate(cursorP, [0, 1], [860, BY + 90]), opacity: f > s(4.1) ? 1 : 0, scale: press < 1 ? 0.9 : 1, filter: "drop-shadow(0 8px 8px rgba(0,0,0,0.3))" }}>
        <path d="M6 4 L6 62 L22 48 L34 74 L46 68 L34 42 L56 42 Z" fill="#FFFFFF" stroke={C.ink} strokeWidth={5} strokeLinejoin="round" />
      </svg>
      <div style={{ position: "absolute", left: 70, top: 820, width: 1360, textAlign: "center", ...body(20, C.ink3, 400), opacity: tw(f, s(2), s(3), 0, 1) }}>
        Projections are hypothetical. Discussion points to review with your advisor, not individual investment advice.
      </div>
    </AbsoluteFill>
  );
};
