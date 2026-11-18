import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { House, Plane } from "lucide-react";
import { C, body, cardStyle, display, figure, tw, useSpring, Heading, Pop, s } from "./comun";

// 4. January 2027. Metaphor: the water tank you carry up the mountain. Today it holds $30K; the climb (and January 2027) needs far more.
const TANK = { x: 770, y: 215, w: 230, h: 590 };
const MAX_K = 180;
const yOf = (k: number) => TANK.y + TANK.h - (k / MAX_K) * TANK.h;

export const SceneJanuary: React.FC = () => {
  const f = useCurrentFrame();
  const flip = useSpring(s(0.3), 12);
  const fill = tw(f, s(3), s(4.6), 0, 30, Easing.out(Easing.cubic));
  const cushion = tw(f, s(5), s(5.8), 0, 1);
  const need = tw(f, s(6.8), s(7.8), 0, 1);
  const waterTop = yOf(fill);
  const wave = (x: number) => Math.sin((x + f * 4) / 26) * 6 + Math.sin((x - f * 3) / 14) * 3;
  const path = `M0 ${wave(0)} ` + Array.from({ length: 24 }, (_, i) => `L${(i + 1) * (TANK.w / 24)} ${wave((i + 1) * (TANK.w / 24))}`).join(" ") + ` L${TANK.w} 800 L0 800 Z`;
  return (
    <AbsoluteFill>
      <Heading title="Two goals, one cash pile" />
      {/* calendar tile */}
      <div style={{ position: "absolute", left: 60, top: 220, width: 560, ...cardStyle, overflow: "hidden", opacity: Math.min(1, flip), rotate: `${interpolate(flip, [0, 1], [-10, 0])}deg`, scale: interpolate(flip, [0, 1], [0.6, 1]), translate: `0px ${Math.sin(f / 30) * 4}px` }}>
        <div style={{ background: C.blue, ...body(36, "#fff", 600), padding: "14px 0", textAlign: "center" }}>January 2027</div>
        <div style={{ padding: "26px 34px", display: "flex", flexDirection: "column", gap: 26, height: 230, position: "relative" }}>
          <Pop delay={s(0.8)} from="left" style={{ position: "relative", display: "flex", gap: 20, alignItems: "center" }}>
            <House size={56} strokeWidth={1.75} color={C.blue} />
            <div>
              <div style={display(42)}>Home · $113,300</div>
              <div style={body(26, C.ink2, 500)}>down payment on a $550K home</div>
            </div>
          </Pop>
          <Pop delay={s(1.5)} from="left" style={{ position: "relative", display: "flex", gap: 20, alignItems: "center" }}>
            <Plane size={56} strokeWidth={1.75} color={C.blue} />
            <div style={display(42)}>Trip · $3,500</div>
          </Pop>
        </div>
      </div>
      <Pop delay={s(2.2)} from="up" style={{ left: 60, top: 640, width: 560 }}>
        <div style={body(32, C.ink2, 500)}>The cash you carry is your water supply for the climb.</div>
      </Pop>

      {/* the tank */}
      <div style={{ position: "absolute", left: TANK.x, top: TANK.y, width: TANK.w, height: TANK.h, borderRadius: 36, background: C.raised, border: `4px solid ${C.blueLine}`, overflow: "hidden", boxShadow: "0 16px 28px -12px rgba(20,20,25,0.18)" }}>
        <svg width={TANK.w} height={TANK.h} style={{ position: "absolute", left: 0, top: 0 }}>
          <g transform={`translate(0 ${waterTop - TANK.y})`}>
            <path d={path} fill={C.sky} opacity={0.85} />
            <path d={path} fill={C.blue} opacity={0.35} transform="translate(0 14)" />
          </g>
          {Array.from({ length: 7 }, (_, i) => {
            const yy = TANK.h - ((f * (1.2 + i * 0.15) + i * 60) % Math.max(10, TANK.h - (waterTop - TANK.y)));
            return fill > 4 ? <circle key={i} cx={30 + i * 28} cy={yy} r={4 + (i % 3)} fill="#FFFFFF" opacity={0.55} /> : null;
          })}
        </svg>
      </div>
      {/* target bands inside / next to the tank */}
      <div style={{ position: "absolute", left: TANK.x + TANK.w + 22, top: yOf(55.836), width: 16, height: yOf(46.53) - yOf(55.836), borderRadius: 8, background: C.success, opacity: cushion, scale: `1 ${cushion}` }} />
      <div style={{ position: "absolute", left: TANK.x + TANK.w + 22, top: yOf(172.636), width: 16, height: yOf(163.33) - yOf(172.636), borderRadius: 8, background: C.error, opacity: need }} />
      <div style={{ position: "absolute", left: TANK.x + TANK.w + 56, top: yOf(55.836) - 36, opacity: cushion, translate: `${(1 - cushion) * -20}px 0px` }}>
        <div style={figure(54, C.success)}>$47–56K</div>
        <div style={body(26, C.ink2, 500)}>a 5–6 month cushion</div>
      </div>
      <div style={{ position: "absolute", left: TANK.x + TANK.w + 56, top: yOf(172.636) - 20, opacity: need, translate: `${(1 - need) * -20}px 0px` }}>
        <div style={figure(54, C.error)}>$163–173K</div>
        <div style={{ ...body(26, C.ink2, 500), maxWidth: 360 }}>cushion + both Jan 2027 goals</div>
      </div>
      <div style={{ position: "absolute", left: TANK.x - 350, top: waterTop - 34, width: 330, textAlign: "right", opacity: tw(f, s(3.4), s(4.4), 0, 1) }}>
        <div style={figure(64, C.blue)}>${Math.round(fill)}K</div>
        <div style={body(26, C.ink2, 500)}>cash today · ≈3.2 months</div>
      </div>
    </AbsoluteFill>
  );
};
