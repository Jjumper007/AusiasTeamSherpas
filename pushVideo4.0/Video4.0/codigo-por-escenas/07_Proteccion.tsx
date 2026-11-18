import React from "react";
import { AbsoluteFill, Easing, random, useCurrentFrame } from "remotion";
import { Anchor, CreditCard, Heart, Umbrella } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { C, body, cardStyle, display, figure, tw, Heading, IconTile, Pop, s } from "./comun";
import { ease } from "./comun";
import { Climber } from "./Escaladores";

// 6. Protection. Metaphor: a safety rope that must reach the anchor, and an umbrella in the rain.
const X0 = 150; // where the rope starts
const PX = 0.6; // px per $K
const RowFrame: React.FC<{ y: number; delay: number; icon: LucideIcon; title: string; children: React.ReactNode }> = ({ y, delay, icon, title, children }) => (
  <Pop delay={delay} from="left" style={{ left: 70, top: y, width: 1360, height: 190 }}>
    <div style={{ ...cardStyle, position: "absolute", inset: 0, boxSizing: "border-box", padding: "20px 28px", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <IconTile icon={icon} size={56} />
        <div style={display(38)}>{title}</div>
      </div>
      {children}
    </div>
  </Pop>
);

export const SceneProtection: React.FC = () => {
  const f = useCurrentFrame();
  const lifeDelay = s(1.2);
  const umbDelay = s(3.4);
  const g = tw(f, lifeDelay + s(0.3), lifeDelay + s(1.3), 0, 1);
  const r = tw(f, lifeDelay + s(0.9), lifeDelay + s(1.9), 0, 1);
  const r2 = tw(f, umbDelay + s(0.8), umbDelay + s(1.8), 0, 1);
  const rainOn = f > umbDelay;
  const coin = tw(f, s(6.5), s(7.5), 0, 1, ease);
  const alert = f > lifeDelay + s(1.9) ? 0.5 + 0.5 * Math.sin((f - lifeDelay) / 6) : 0;
  return (
    <AbsoluteFill>
      <Heading title="Below the suggested levels" />
      {/* life insurance: the rope is too short to reach the anchor */}
      <RowFrame y={190} delay={lifeDelay} icon={Heart} title="Life insurance">
        <div style={{ position: "absolute", left: X0 + 80, top: 88, width: 1100 * r, height: 56, borderRadius: 14, background: `${C.success}22`, border: `3px solid ${C.success}55` }} />
        <div style={{ position: "absolute", left: X0 + 80 + 900 * PX - 3, top: 78, width: 6, height: 76, borderRadius: 3, background: C.success, opacity: r }} />
        <div style={{ position: "absolute", left: X0 + 80 + 900 * PX - 18, top: 40, opacity: r }}>
          <Anchor size={40} strokeWidth={1.75} color={C.success} />
        </div>
        <div style={{ position: "absolute", left: X0 + 80, top: 100, width: Math.max(10, 180 * PX * g), height: 10, borderRadius: 5, background: C.lavender, boxShadow: `0 0 ${alert * 20}px ${C.error}` }} />
        <div style={{ position: "absolute", left: X0 + 80 + 180 * PX * g - 4, top: 92, width: 8, height: 26, background: C.error, borderRadius: 4, opacity: g, rotate: "14deg" }} />
        <div style={{ position: "absolute", left: X0 - 20, top: 52, width: 90, height: 120 }}>
          <Climber phase={f * 0.2} jacket={C.blue} hat={C.sky} moving={0.1} lean={2} pole={false} />
        </div>
        <div style={{ position: "absolute", left: X0 + 80, top: 150, ...body(28, C.error, 600), opacity: g }}>You: $180K</div>
        <div style={{ position: "absolute", left: X0 + 80 + 900 * PX, top: 150, ...body(28, C.success, 600), opacity: r, whiteSpace: "nowrap" }}>Suggested: $900K–$1.8M</div>
      </RowFrame>

      {/* umbrella: nothing between you and the rain */}
      <RowFrame y={400} delay={umbDelay} icon={Umbrella} title="Umbrella">
        {rainOn
          ? Array.from({ length: 26 }, (_, i) => {
              const x = X0 - 10 + random(`rx${i}`) * 170;
              const sp = 7 + random(`rs${i}`) * 5;
              const y = ((f * sp + random(`ry${i}`) * 300) % 190) - 10;
              return <div key={i} style={{ position: "absolute", left: x, top: y, width: 3, height: 18, borderRadius: 2, background: C.sky, opacity: 0.8, rotate: "12deg" }} />;
            })
          : null}
        <div style={{ position: "absolute", left: X0 - 20, top: 52, width: 90, height: 120 }}>
          <Climber phase={f * 0.2} jacket={C.lavender} hat={C.blueBright} moving={0.1} lean={2} pole={false} />
        </div>
        <div style={{ position: "absolute", left: X0 + 80, top: 84, width: 1000 * PX * r2, height: 56, borderRadius: 14, border: `3px dashed ${C.success}`, opacity: r2 }} />
        <div style={{ position: "absolute", left: X0 + 80 + 1000 * PX - 60, top: 70, opacity: r2, scale: 1 + Math.sin(f / 9) * 0.04 }}>
          <Umbrella size={84} strokeWidth={1.5} color={C.success} strokeDasharray="6 6" />
        </div>
        <div style={{ position: "absolute", left: X0 + 80, top: 150, ...body(28, C.error, 600), opacity: r2 }}>You: none</div>
        <div style={{ position: "absolute", left: X0 + 80 + 1000 * PX - 120, top: 150, ...body(28, C.success, 600), opacity: r2, whiteSpace: "nowrap" }}>Suggested: $1M minimum</div>
      </RowFrame>

      <Pop delay={s(6.5)} from="up" style={{ left: 70, top: 640, width: 800 }}>
        <div style={{ ...cardStyle, padding: "22px 36px", display: "flex", gap: 24, alignItems: "center", borderLeft: `10px solid ${C.error}` }}>
          <div style={{ scale: coin, rotate: `${(1 - coin) * -40}deg` }}>
            <IconTile icon={CreditCard} size={84} bg="#FDEAEA" color={C.error} />
          </div>
          <div>
            <div style={display(38)}>
              Amex · $3,500 at <span style={{ color: C.error }}>20%</span>
            </div>
            <div style={body(28, C.ink2, 500)}>At $200/month, paid off by July 2028</div>
          </div>
        </div>
      </Pop>
      <Pop delay={s(7.2)} from="up" style={{ left: 920, top: 664 }}>
        <div style={figure(86, C.error)}>
          −$720K
          <div style={{ ...body(28, C.ink2, 500), letterSpacing: 0, marginTop: 8 }}>of life cover short</div>
        </div>
      </Pop>
    </AbsoluteFill>
  );
};
