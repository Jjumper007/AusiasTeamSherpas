import React from "react";
import { AbsoluteFill, Easing, useCurrentFrame } from "remotion";
import { Check, Landmark, PiggyBank, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { C, body, cardStyle, display, figure, tw, Heading, IconTile, Pop, Burst, s } from "./comun";
import { RopeTeam, Tent, Flag } from "./Escaladores";

// 2. Strengths. Metaphor: a well-stocked base camp before the climb.
const Stat: React.FC<{ x: number; delay: number; value: number; prefix: string; suffix: string; label: string; color: string; icon: LucideIcon; ring?: number }> = ({ x, delay, value, prefix, suffix, label, color, icon, ring }) => {
  const f = useCurrentFrame();
  const v = tw(f, delay, delay + s(1.3), 0, value, Easing.out(Easing.cubic));
  const r = tw(f, delay, delay + s(1.3), 0, ring ?? 0);
  return (
    <Pop delay={delay} from="scale" style={{ left: x, top: 200, width: 420, height: 330 }}>
      <div style={{ ...cardStyle, position: "absolute", inset: 0, boxSizing: "border-box", padding: "28px 32px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <IconTile icon={icon} size={76} bg={`${color}1A`} color={color} />
          {ring ? (
            <svg width={92} height={92} viewBox="0 0 92 92">
              <circle cx={46} cy={46} r={36} fill="none" stroke={C.chipTrack} strokeWidth={12} />
              <circle cx={46} cy={46} r={36} fill="none" stroke={color} strokeWidth={12} strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 36 * r} ${2 * Math.PI * 36}`} transform="rotate(-90 46 46)" />
            </svg>
          ) : null}
        </div>
        <div>
          <div style={figure(104, color)}>
            {prefix}
            {Math.round(v)}
            <span style={{ fontSize: suffix.length > 1 ? 56 : 104 }}>{suffix}</span>
          </div>
          <div style={{ ...body(34, C.ink2, 500), marginTop: 12 }}>{label}</div>
        </div>
      </div>
    </Pop>
  );
};

export const SceneStrengths: React.FC = () => {
  const f = useCurrentFrame();
  const camp = tw(f, s(0.4), s(1.4), 0, 1);
  return (
    <AbsoluteFill>
      <Heading title="A strong starting point" />
      <div style={{ position: "absolute", left: 70, top: 142, opacity: camp, ...body(34, C.ink2, 500) }}>A well-stocked base camp for the climb</div>
      <Stat x={70} delay={s(2.8)} value={247} prefix="$" suffix="K" label="total assets" color={C.blue} icon={Landmark} />
      <Stat x={540} delay={s(4.2)} value={145} prefix="$" suffix="K" label="invested" color={C.chartPurple} icon={TrendingUp} />
      <Stat x={1010} delay={s(6.3)} value={43} prefix="$" suffix="K/yr" label="saved · 23.9% of income" color={C.chartSavings} icon={PiggyBank} ring={0.239} />
      {/* base camp scene */}
      <div style={{ position: "absolute", left: 70, top: 590, width: 1360, height: 3, background: C.hairline }} />
      <div style={{ position: "absolute", left: 90, top: 520, opacity: camp }}>
        <Tent width={120} color={C.sky} />
      </div>
      <div style={{ position: "absolute", left: 260, top: 475, opacity: camp }}>
        <Flag height={110} color={C.chartSavings} />
      </div>
      <div style={{ position: "absolute", left: 400 + ((f * 1.1) % 700), top: 470, opacity: camp }}>
        <RopeTeam phase={f * 0.3} width={52} moving={1} lean={4} />
      </div>
      <Pop delay={s(7.2)} from="scale" style={{ left: 330, top: 640 }}>
        <div style={{ ...body(42, "#FFFFFF", 600), display: "flex", alignItems: "center", gap: 14, padding: "20px 44px", borderRadius: 80, background: C.success, boxShadow: "0 10px 24px rgba(29,174,83,0.35)" }}>
          <Check size={44} strokeWidth={2.5} color="#fff" />
          Full $7,000 employer match captured
        </div>
      </Pop>
      <Burst start={s(7.4)} x={740} y={690} />
    </AbsoluteFill>
  );
};
