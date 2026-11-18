import React from "react";
import { AbsoluteFill, Easing, useCurrentFrame } from "remotion";
import { Anchor, Backpack } from "lucide-react";
import { C, FONT, FONT_DISPLAY, VW, VH, body, cardStyle, display, figure, tw, useSpring, Heading, Pop, Burst, s } from "./comun";
import { RopeTeam } from "./Escaladores";
import { AGE_START, assetsAt, DEPLETION_AGE, RETIRE_AGE } from "./datos";

// 5. Retirement. The climb is the real projection (investable assets by age, today's dollars). Social Security is the fixed rope.
export const AGE_VIEW_END = 91;
const CX = 130;
const CY = 215;
const CW = 800;
const CH = 470;
const MAX = 1200000;
const ax = (a: number) => CX + ((a - AGE_START) / (AGE_VIEW_END - AGE_START)) * CW;
const ay = (v: number) => CY + CH - (Math.max(0, v) / MAX) * CH;

export const SceneRetirement: React.FC = () => {
  const f = useCurrentFrame();
  const draw = tw(f, s(0.4), s(7.5), AGE_START, AGE_VIEW_END, Easing.inOut(Easing.quad));
  const pts: string[] = [];
  for (let a = AGE_START; a <= Math.min(draw, DEPLETION_AGE); a += 0.5) pts.push(`${ax(a).toFixed(1)},${ay(assetsAt(a)).toFixed(1)}`);
  const head = Math.min(draw, DEPLETION_AGE);
  const area = pts.length > 1 ? `M${ax(AGE_START)},${ay(0)} L${pts.join(" L")} L${ax(head)},${ay(0)} Z` : "";
  const gap = tw(f, s(7.5), s(8.3), 0, 1);
  const card = useSpring(s(3.4));
  const ss = tw(f, s(3.6), s(5), 0, 0.34);
  const pulse = draw >= DEPLETION_AGE ? Math.sin(f / 4) * 4 : 0;
  const moving = draw > AGE_START + 0.2 && draw < AGE_VIEW_END - 0.2;
  const cxp = ax(Math.min(draw, AGE_VIEW_END));
  const cyp = ay(assetsAt(Math.min(draw, DEPLETION_AGE)));
  const slopeNow = (ay(assetsAt(Math.min(draw + 1, DEPLETION_AGE))) - ay(assetsAt(Math.min(draw, DEPLETION_AGE)))) * 0.25;
  return (
    <AbsoluteFill>
      <Heading title="Does the money last to 91?" />
      <div style={{ position: "absolute", left: CX - 40, top: CY - 30, width: CW + 80, height: CH + 120, ...cardStyle, borderRadius: 32 }} />
      <svg width={VW} height={VH} style={{ position: "absolute", overflow: "visible" }}>
        <defs>
          <linearGradient id="areaRet" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.blue} stopOpacity={0.3} />
            <stop offset="1" stopColor={C.blue} stopOpacity={0} />
          </linearGradient>
        </defs>
        {[0, 500000, 1000000].map((k) => (
          <g key={k}>
            <line x1={CX} y1={ay(k)} x2={CX + CW} y2={ay(k)} stroke={C.hairline} strokeWidth={2} strokeDasharray="6 8" />
            <text x={CX - 12} y={ay(k) + 9} textAnchor="end" fontSize={24} fill={C.ink3} fontFamily={FONT}>
              {k === 0 ? "$0" : k === 500000 ? "$500K" : "$1M"}
            </text>
          </g>
        ))}
        {[37, 50, 58, 70, 85, 91].map((a) => (
          <text key={a} x={ax(a)} y={CY + CH + 42} textAnchor="middle" fontSize={26} fontWeight={[58, 85, 91].includes(a) ? 700 : 500} fill={[58, 85, 91].includes(a) ? C.ink : C.ink3} fontFamily={FONT}>
            {a}
          </text>
        ))}
        <rect x={ax(DEPLETION_AGE)} y={CY} width={(ax(91) - ax(DEPLETION_AGE)) * gap} height={CH} fill={C.error} opacity={0.12} />
        <text x={(ax(DEPLETION_AGE) + ax(91)) / 2} y={CY + 40} textAnchor="middle" fontSize={28} fontWeight={600} fill={C.error} opacity={gap} fontFamily={FONT_DISPLAY}>
          6 yrs
        </text>
        <line x1={ax(RETIRE_AGE)} y1={CY} x2={ax(RETIRE_AGE)} y2={CY + CH} stroke={C.blue} strokeWidth={3} strokeDasharray="10 8" opacity={draw > RETIRE_AGE ? 1 : 0} />
        {area ? <path d={area} fill="url(#areaRet)" /> : null}
        <polyline points={pts.join(" ")} fill="none" stroke={C.blue} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
        {draw > RETIRE_AGE ? <circle cx={ax(RETIRE_AGE)} cy={ay(assetsAt(RETIRE_AGE))} r={13} fill={C.blue} stroke="#fff" strokeWidth={4} /> : null}
        {draw >= DEPLETION_AGE ? <circle cx={ax(DEPLETION_AGE)} cy={ay(0)} r={16 + pulse} fill={C.error} stroke="#fff" strokeWidth={4} /> : null}
        <text x={CX} y={CY + CH + 90} fontSize={22} fill={C.ink3} fontFamily={FONT} fontStyle="italic">
          Investable assets by age, in today's dollars (plan projection).
        </text>
      </svg>
      {/* climbers walking the real curve */}
      <div style={{ position: "absolute", left: cxp - 62, top: cyp - 96 + 8, opacity: draw < AGE_VIEW_END - 0.05 ? 1 : 0, rotate: `${Math.max(-22, Math.min(22, slopeNow))}deg`, transformOrigin: "50% 100%" }}>
        <RopeTeam phase={f * 0.4} width={60} moving={moving ? 1 : 0} lean={6} />
      </div>
      <Pop delay={s(3)} from="scale" style={{ left: ax(RETIRE_AGE) - 150, top: ay(assetsAt(RETIRE_AGE)) - 96, ...body(30, "#fff", 600), padding: "8px 22px", borderRadius: 14, background: C.blue, whiteSpace: "nowrap" }}>
        ≈$1.07M liquid at 58
      </Pop>
      <Pop delay={s(7.6)} from="right" style={{ left: ax(DEPLETION_AGE) - 330, top: ay(0) - 76, ...body(30, "#fff", 600), padding: "8px 22px", borderRadius: 14, background: C.error, whiteSpace: "nowrap" }}>
        runs out at 85 →
      </Pop>
      <Burst start={s(7.5)} x={ax(DEPLETION_AGE)} y={ay(0)} colors={[C.error, C.warning, C.gold]} count={14} power={120} />

      {/* Social Security = the fixed rope */}
      <div style={{ position: "absolute", left: 1010, top: 215, width: 430, ...cardStyle, padding: "30px 32px", boxSizing: "border-box", opacity: Math.min(1, card), scale: 0.7 + 0.3 * card, transformOrigin: "50% 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Anchor size={40} strokeWidth={1.75} color={C.blue} />
          <div style={display(34)}>The fixed rope</div>
        </div>
        <div style={{ ...figure(120, C.blue), marginTop: 18 }}>{Math.round(ss * 100)}%</div>
        <div style={body(28, C.ink2, 500)}>Social Security covers this share of the $89,649 you need each year</div>
        <div style={{ display: "flex", height: 26, borderRadius: 13, overflow: "hidden", marginTop: 22, background: C.chipTrack }}>
          <div style={{ width: `${(ss / 0.34) * 34}%`, background: C.blue }} />
          <div style={{ flex: 1, background: C.chartPurple, opacity: tw(f, s(4.6), s(5.4), 0, 1) }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 24, opacity: tw(f, s(5), s(5.8), 0, 1) }}>
          <Backpack size={36} strokeWidth={1.75} color={C.chartPurple} />
          <div style={body(28, C.ink, 500)}>
            Your savings carry the rest:
            <br />
            about <b>$59,613</b> a year
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
