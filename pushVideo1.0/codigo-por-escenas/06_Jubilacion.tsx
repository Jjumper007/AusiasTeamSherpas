import React from "react";
import { AbsoluteFill, Easing, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, VW, VH, clamp, ease, tw, useSpring, Heading, Pop, cardStyle, s } from "./comun";

// 5. Retirement
const liquidAt = (age: number) => {
  if (age <= 58) return 145 + (1071 - 145) * Math.pow((age - 37) / 21, 1.35);
  if (age <= 85) return 1071 * (1 - Math.pow((age - 58) / 27, 1.6));
  return 0;
};
export const SceneRetirement: React.FC = () => {
  const f = useCurrentFrame();
  const CX = 130;
  const CY = 210;
  const CW = 860;
  const CH = 500;
  const ax = (a: number) => CX + ((a - 37) / 54) * CW;
  const ay = (k: number) => CY + CH - (k / 1200) * CH;
  const draw = tw(f, s(0.4), s(7.5), 37, 91, Easing.inOut(Easing.quad));
  const pts: string[] = [];
  for (let a = 37; a <= Math.min(draw, 85); a += 0.5) pts.push(`${ax(a).toFixed(1)},${ay(liquidAt(a)).toFixed(1)}`);
  const head = Math.min(draw, 85);
  const area = pts.length > 1 ? `M${ax(37)},${ay(0)} L${pts.join(" L")} L${ax(head)},${ay(0)} Z` : "";
  const gap = tw(f, s(7.5), s(8.3), 0, 1);
  const donut = useSpring(s(3.4));
  const ss = tw(f, s(3.6), s(5), 0, 0.34);
  const R = 110;
  const circ = 2 * Math.PI * R;
  return (
    <AbsoluteFill>
      <Heading kicker="RETIREMENT" title="Does the money last to 91?" />
      <svg width={VW} height={VH} style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="area2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.green} stopOpacity={0.35} />
            <stop offset="1" stopColor={C.green} stopOpacity={0} />
          </linearGradient>
        </defs>
        {[0, 500, 1000].map((k) => (
          <g key={k}>
            <line x1={CX} y1={ay(k)} x2={CX + CW} y2={ay(k)} stroke={C.grey} strokeWidth={2} />
            <text x={CX - 14} y={ay(k) + 9} textAnchor="end" fontSize={26} fill={C.muted} fontFamily={FONT}>{k === 0 ? "$0" : k === 500 ? "$500K" : "$1M"}</text>
          </g>
        ))}
        <line x1={CX} y1={CY + CH} x2={CX + CW} y2={CY + CH} stroke={C.muted} strokeWidth={3} />
        {[40, 50, 58, 70, 85, 91].map((a) => (
          <text key={a} x={ax(a)} y={CY + CH + 40} textAnchor="middle" fontSize={28} fontWeight={[58, 85, 91].includes(a) ? 800 : 500} fill={C.muted} fontFamily={FONT}>{a}</text>
        ))}
        <rect x={ax(85)} y={CY} width={(ax(91) - ax(85)) * gap} height={CH} fill={C.red} opacity={0.16} />
        <text x={(ax(85) + ax(91)) / 2} y={CY + 40} textAnchor="middle" fontSize={28} fontWeight={800} fill={C.red} opacity={gap} fontFamily={FONT}>6 yrs</text>
        <line x1={ax(58)} y1={CY} x2={ax(58)} y2={CY + CH} stroke={C.blue} strokeWidth={3} strokeDasharray="10 8" opacity={draw > 58 ? 1 : 0} />
        {area ? <path d={area} fill="url(#area2)" /> : null}
        <polyline points={pts.join(" ")} fill="none" stroke={C.green} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
        {draw < 85 ? <circle cx={ax(head)} cy={ay(liquidAt(head))} r={11} fill={C.green} stroke="#fff" strokeWidth={4} /> : null}
        {draw > 58 ? <circle cx={ax(58)} cy={ay(1071)} r={12} fill={C.green} stroke="#fff" strokeWidth={4} /> : null}
        {draw >= 85 ? <circle cx={ax(85)} cy={ay(0)} r={12 + Math.sin(f / 4) * 3} fill={C.red} stroke="#fff" strokeWidth={4} /> : null}
      </svg>
      <Pop delay={s(3)} from="scale" style={{ left: ax(58) - 130, top: ay(1071) - 74, fontSize: 34, fontWeight: 800, color: C.green, whiteSpace: "nowrap" }}>≈$1.07M liquid at 58</Pop>
      <Pop delay={s(7.6)} from="right" style={{ left: ax(85) - 300, top: ay(0) - 66, fontSize: 34, fontWeight: 800, color: C.red, whiteSpace: "nowrap" }}>runs out at 85 →</Pop>
      <div style={{ position: "absolute", left: CX, top: CY + CH + 62, fontSize: 22, color: C.muted, fontStyle: "italic" }}>Simplified shape of the report's projection (liquid savings).</div>
      <div style={{ position: "absolute", left: 1060, top: 210, width: 380, ...cardStyle, padding: "26px 0", opacity: Math.min(1, donut), scale: interpolate(donut, [0, 1], [0.6, 1]), display: "flex", flexDirection: "column", alignItems: "center" }}>
        <svg width={280} height={280} viewBox="0 0 280 280">
          <circle cx={140} cy={140} r={R} fill="none" stroke={C.grey} strokeWidth={40} />
          <circle cx={140} cy={140} r={R} fill="none" stroke={C.blue} strokeWidth={40} strokeDasharray={`${circ * ss} ${circ}`} strokeLinecap="round" transform="rotate(-90 140 140)" />
          <text x={140} y={158} textAnchor="middle" fontSize={60} fontWeight={900} fill={C.blue} fontFamily={FONT}>{Math.round(ss * 100)}%</text>
        </svg>
        <div style={{ fontSize: 32, fontWeight: 800, color: C.ink, marginTop: 8 }}>Social Security</div>
        <div style={{ fontSize: 26, fontWeight: 600, color: C.muted, textAlign: "center", lineHeight: 1.3 }}>
          of $89,649 / yr needed.
          <br />
          Savings: ≈$59,600 / yr
        </div>
      </div>
    </AbsoluteFill>
  );
};
