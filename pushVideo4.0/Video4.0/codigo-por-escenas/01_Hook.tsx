import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Plane } from "lucide-react";
import { C, VW, VH, body, display, figure, tw, useSpring, Pop, Burst, s } from "./comun";
import { ease } from "./comun";
import { RopeTeam, Flag } from "./Escaladores";

// 0. Hook: retire at 58, a trip every year. Metaphor: the climb to the summit flag.
const WORDS_1 = ["Retire", "at", "58."];
const WORDS_2 = ["A", "trip", "every", "year."];

const Words: React.FC<{ words: string[]; start: number; top: number; accent: number }> = ({ words, start, top, accent }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 70, top, display: "flex", gap: 26 }}>
      {words.map((w, i) => {
        const p = tw(f, start + i * 5, start + i * 5 + 20, 0, 1);
        return (
          <span key={i} style={{ ...display(112, i === accent ? C.blue : C.ink, { letterSpacing: "-0.03em" }), display: "inline-block", opacity: p, translate: `0px ${(1 - p) * 70}px`, rotate: `${(1 - p) * 5}deg`, filter: p < 0.98 ? `blur(${(1 - p) * 10}px)` : undefined }}>
            {w}
          </span>
        );
      })}
    </div>
  );
};

// Trail from base camp to the summit (screen coordinates).
const TRAIL: [number, number][] = [
  [790, 800],
  [900, 700],
  [840, 610],
  [980, 520],
  [930, 430],
  [1060, 340],
  [1180, 290],
];
const trailPoint = (p: number): [number, number, number] => {
  const lens = TRAIL.slice(1).map((pt, i) => Math.hypot(pt[0] - TRAIL[i][0], pt[1] - TRAIL[i][1]));
  const total = lens.reduce((a, b) => a + b, 0);
  let d = p * total;
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const t = Math.min(1, d / lens[i]);
      return [TRAIL[i][0] + (TRAIL[i + 1][0] - TRAIL[i][0]) * t, TRAIL[i][1] + (TRAIL[i + 1][1] - TRAIL[i][1]) * t, Math.atan2(TRAIL[i + 1][1] - TRAIL[i][1], TRAIL[i + 1][0] - TRAIL[i][0])];
    }
    d -= lens[i];
  }
  return [TRAIL[0][0], TRAIL[0][1], 0];
};

export const SceneHook: React.FC = () => {
  const f = useCurrentFrame();
  const mtn = useSpring(s(0.3), 18, 90);
  const p = tw(f, s(1.2), s(5.4), 0, 1, Easing.inOut(Easing.quad));
  const [cx, cy, ang] = trailPoint(p);
  const slope = Math.max(-18, Math.min(18, (ang * 180) / Math.PI * -0.45)) + 8;
  const done = p >= 1;
  const orbit = (f - s(5.2)) / 38;
  const flagUp = tw(f, s(4.9), s(5.6), 0, 1, ease);
  const sun = tw(f, 0, s(1.4), 0, 1);
  return (
    <AbsoluteFill>
      {/* mountain: far and near ridge, snow cap */}
      <svg width={VW} height={VH} style={{ position: "absolute", opacity: mtn, translate: `0px ${(1 - mtn) * 80}px` }}>
        <path d="M640 840 L860 520 L940 580 L1170 250 L1500 840 Z" fill={C.blueLine} />
        <path d="M820 840 L1060 450 L1170 250 L1300 470 L1420 600 L1500 840 Z" fill="#A4B7FD" />
        <path d="M1170 250 L1120 340 L1150 330 L1172 372 L1205 330 L1235 345 Z" fill="#FFFFFF" />
        <path d="M700 840 L930 650 L1100 760 L1330 610 L1500 840 Z" fill={C.blue} opacity={0.9} />
        <polyline points={TRAIL.map((t) => t.join(",")).join(" ")} fill="none" stroke="#FFFFFF" strokeWidth={6} strokeDasharray="2 14" strokeLinecap="round" opacity={0.85} />
      </svg>
      <div style={{ position: "absolute", left: 1290, top: 110, width: 110, height: 110, borderRadius: "50%", background: C.gold, opacity: 0.9 * sun, scale: 0.6 + 0.4 * sun, translate: `0px ${Math.sin(f / 30) * 6}px` }} />
      {/* summit flag + big 58 */}
      <div style={{ position: "absolute", left: 1172, top: 150, scale: flagUp, transformOrigin: "0 100%", opacity: flagUp }}>
        <Flag height={150} color={C.blue} label="58" />
      </div>
      {/* climbers */}
      <div style={{ position: "absolute", left: cx - 78, top: cy - 100, opacity: done ? 0 : 1 }}>
        <RopeTeam phase={f * 0.42} width={62} moving={p > 0 && p < 1 ? 1 : 0.15} lean={slope} />
      </div>
      <div style={{ position: "absolute", left: 1150 - 60, top: 250 - 88, opacity: done ? 1 : 0 }}>
        <RopeTeam phase={0} width={62} moving={0} lean={0} />
      </div>
      {/* trip: a plane looping around the summit */}
      <div style={{ position: "absolute", left: 1170 + Math.cos(orbit) * 150 - 26, top: 250 + Math.sin(orbit) * 70 - 26, rotate: `${(orbit * 180) / Math.PI + 90}deg`, opacity: f > s(5.2) ? 1 : 0 }}>
        <Plane size={52} strokeWidth={1.75} color={C.blue} />
      </div>
      <Burst start={s(5.6)} x={1172} y={250} colors={[C.blue, C.lavender, C.sky, C.gold]} count={26} power={200} />

      <Words words={WORDS_1} start={s(0.7)} top={190} accent={2} />
      <Words words={WORDS_2} start={s(1.4)} top={322} accent={3} />
      <div style={{ position: "absolute", left: 70, top: 480, width: tw(f, s(2.3), s(3), 0, 520), height: 8, borderRadius: 4, background: C.blue }} />
      <Pop delay={s(2.3)} from="up" style={{ left: 70, top: 512 }}>
        <div style={body(34, C.ink2, 500)}>Michael · Financial Health & Investment Analysis · Nov 2026</div>
      </Pop>
      <Pop delay={s(3)} from="up" style={{ left: 70, top: 580 }}>
        <div style={{ ...figure(150, C.blue), opacity: interpolate(f, [s(3), s(3.6)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          58<span style={{ ...body(38, C.ink2, 500), letterSpacing: 0, marginLeft: 18 }}>the summit: retirement age</span>
        </div>
      </Pop>
    </AbsoluteFill>
  );
};
