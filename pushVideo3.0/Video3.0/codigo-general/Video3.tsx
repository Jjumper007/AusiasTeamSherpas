import React from "react";
import { AbsoluteFill, Easing, Sequence, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Check } from "lucide-react";
import { Advisor, ADVISOR_POSES, AdvisorExpr, AdvisorPose, ArmSet } from "./characters/Advisor";
import { FPS, s, C, FONT, FONT_DISPLAY, clamp, tw, VW, VH, Backdrop, Burst } from "../codigo-por-escenas/comun";
import { Wordmark } from "../codigo-por-escenas/Marca";
import { SCENE_COMPONENTS, SceneApertura, SceneCierre, APERTURA, APERTURA_IRIS_START, CIERRE, CIERRE_OVERLAP } from "../codigo-por-escenas";
import { SfxApertura, SfxCierre, SfxContent } from "./Sonido";

// Video 3.0: Michael's plan with Sherpas' own design (Poppins/Inter, brand palette, Lucide icons), a persistent summit tracker with climbers,
// visual metaphors in every scene and sound effects. Subtitles only, no narration yet (voice comes later).
// Scene code lives in ../codigo-por-escenas (one file per scene).

const SCENES = [0, 6, 12, 22, 33, 44, 56, 66, 75, 84, 96];
const CHAPTERS = ["", "Your report", "Where you stand", "Cash flow", "January 2027", "Retirement", "Protection", "Investments", "Where to start", "Your next step"];
const CONTENT_DURATION = s(SCENES[SCENES.length - 1]);
// Branded Apertura (iris opens onto the video) and Cierre (iris closes onto the logo).
export const CONTENT_FROM = APERTURA_IRIS_START + 8;
export const OUTRO_FROM = CONTENT_FROM + CONTENT_DURATION - CIERRE_OVERLAP;
export const VIDEO3_DURATION = OUTRO_FROM + CIERRE;

type Sub = { from: number; to: number; text: string; pose: AdvisorPose; expr: AdvisorExpr };
const SUBS: Sub[] = [
  { from: 0.8, to: 3.2, text: "Michael, you want to retire at 58 and travel every year.", pose: "welcome", expr: "happy" },
  { from: 3.2, to: 5.8, text: "Will your money last that long? Let's find out.", pose: "present", expr: "happy" },
  { from: 6.3, to: 9, text: "Your report checks six areas of your financial life.", pose: "explain", expr: "happy" },
  { from: 9, to: 11.8, text: "Here's what each one says, in under two minutes.", pose: "point", expr: "happy" },
  { from: 12.3, to: 15, text: "Good news first: you're starting strong.", pose: "thumbsUp", expr: "happy" },
  { from: 15, to: 18.5, text: "$247K in assets, and $145K of it invested.", pose: "point", expr: "happy" },
  { from: 18.5, to: 21.8, text: "You save $43K a year, full employer match included.", pose: "thumbsUp", expr: "happy" },
  { from: 22.3, to: 25.5, text: "But one $180K income is doing five jobs.", pose: "explain", expr: "neutral" },
  { from: 25.5, to: 29, text: "Taxes, rent, living, debt and savings: more than you earn.", pose: "point", expr: "neutral" },
  { from: 29, to: 32.8, text: "About $8,300 a year short. A question of order, not effort.", pose: "explain", expr: "happy" },
  { from: 33.3, to: 36.5, text: "January 2027: a $113,300 home and a $3,500 trip.", pose: "present", expr: "neutral" },
  { from: 36.5, to: 40, text: "Your $30K in cash covers about 3 months. Aim for 5 to 6.", pose: "point", expr: "concerned" },
  { from: 40, to: 43.8, text: "With both goals, you'd need $163K to $173K in cash.", pose: "count", expr: "concerned" },
  { from: 44.3, to: 47.5, text: "At 58, you'd have about $1.07M in liquid savings.", pose: "present", expr: "neutral" },
  { from: 47.5, to: 51, text: "Social Security covers just 34% of your yearly need.", pose: "point", expr: "neutral" },
  { from: 51, to: 55.8, text: "So savings run out at 85, six years before the plan ends at 91.", pose: "think", expr: "concerned" },
  { from: 56.3, to: 59.5, text: "Your protection has gaps too.", pose: "explain", expr: "concerned" },
  { from: 59.5, to: 62.8, text: "Life cover is $720K below the suggested minimum. No umbrella policy.", pose: "point", expr: "concerned" },
  { from: 62.8, to: 65.8, text: "And that $3,500 card at 20% is your priciest debt.", pose: "count", expr: "neutral" },
  { from: 66.3, to: 69.5, text: "Your investments? Solid: about 13.6% a year.", pose: "thumbsUp", expr: "happy" },
  { from: 69.5, to: 74.8, text: "The proposed 67/33 mix sits closer to your Growth profile.", pose: "point", expr: "neutral" },
  { from: 75.3, to: 78.5, text: "Everything competes for the same dollars.", pose: "explain", expr: "neutral" },
  { from: 78.5, to: 83.8, text: "So: cushion first, then the card, then retirement.", pose: "count", expr: "happy" },
  { from: 84.3, to: 88, text: "This plan works best when we build it together.", pose: "welcome", expr: "happy" },
  { from: 88, to: 91.8, text: "Book your plan review, and we'll set the order with you.", pose: "point", expr: "happy" },
  { from: 91.8, to: 95.6, text: "Your freedom at 58 starts with one conversation.", pose: "thumbsUp", expr: "happy" },
];

// Camera shots. "close" = presenter close-up, "screen" = presentation full frame.
type Shot = "wide" | "close" | "screen";
const SHOTS: { at: number; shot: Shot }[] = [
  { at: 0, shot: "close" },
  { at: 3.2, shot: "wide" },
  { at: 6, shot: "wide" },
  { at: 9, shot: "screen" },
  { at: 12, shot: "close" },
  { at: 15, shot: "screen" },
  { at: 18.5, shot: "wide" },
  { at: 22, shot: "close" },
  { at: 25.5, shot: "screen" },
  { at: 29, shot: "wide" },
  { at: 33, shot: "wide" },
  { at: 36.5, shot: "screen" },
  { at: 44, shot: "screen" },
  { at: 51, shot: "close" },
  { at: 56, shot: "close" },
  { at: 59.5, shot: "screen" },
  { at: 62.8, shot: "wide" },
  { at: 66, shot: "close" },
  { at: 69.5, shot: "screen" },
  { at: 75, shot: "wide" },
  { at: 78.5, shot: "screen" },
  { at: 84, shot: "close" },
  { at: 87, shot: "screen" },
  { at: 91.8, shot: "wide" },
];
// Times (s) where the camera changes shot: each one gets a sound effect.
const CUTS = SHOTS.filter((x, i) => i > 0 && x.shot !== SHOTS[i - 1].shot).map((x) => x.at);
const SHOT_PARAMS: Record<Shot, { cx: number; cy: number; sc: number }> = {
  wide: { cx: 960, cy: 540, sc: 1 },
  close: { cx: 560, cy: 440, sc: 1.75 },
  screen: { cx: 1215, cy: 530, sc: 1.22 },
};

// Callouts: status colours only where they carry meaning (DESIGN.md).
const BURSTS: { at: number; text: string; color: string; good: boolean; check?: boolean }[] = [
  { at: 3.6, text: "Will it last?", color: C.blue, good: true },
  { at: 19.2, text: "Full match", color: C.success, good: true, check: true },
  { at: 41, text: "≈$133K short", color: C.error, good: false },
  { at: 52, text: "Empty at 85", color: C.error, good: false },
  { at: 60.2, text: "$720K gap", color: C.error, good: false },
  { at: 67, text: "+13.6% / yr", color: C.success, good: true },
];

const HELP: { from: number; to: number; text: string }[] = [
  { from: 29.4, to: 32.9, text: "We give every dollar one clear job" },
  { from: 40.4, to: 43.9, text: "We plan your home cash, step by step" },
  { from: 51.6, to: 55.9, text: "We model ways to make it last to 91" },
  { from: 62.6, to: 65.9, text: "We compare cover that fits your budget" },
  { from: 70, to: 74.9, text: "We rebalance toward your Growth profile" },
];

// ---------------- Office ----------------
const SCREEN = { x: 610, y: 96, w: 1250, h: 770 };
const INNER = { x: 635, y: 121, w: 1200, h: 720 }; // virtual 1500x900 scaled 0.8
const buildings = Array.from({ length: 9 }, (_, i) => ({ x: i * 64 - 10, w: 52 + ((i * 37) % 24), h: 180 + ((i * 97) % 220) }));
const farBuildings = Array.from({ length: 11 }, (_, i) => ({ x: i * 52 - 20, w: 44, h: 120 + ((i * 61) % 160) }));

const Office: React.FC = () => {
  const f = useCurrentFrame();
  const cloudX = (f * 0.35) % 700;
  const sec = Math.floor(f / 30);
  const minuteA = (f / 30) * 6;
  return (
    <>
      <div style={{ position: "absolute", left: -300, top: -200, width: 2520, height: 1100, background: "linear-gradient(180deg, #F8FAFD 0%, #E0E7F6 100%)" }} />
      {[300, 1230].map((x) => (
        <div key={x} style={{ position: "absolute", left: x - 400, top: -300, width: 800, height: 600, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(255,255,255,0.9), rgba(255,255,255,0))" }} />
      ))}
      {/* wall art: a ridge line */}
      <div style={{ position: "absolute", left: 120, top: -10, width: 150, height: 84, borderRadius: 8, background: "#fff", boxShadow: "0 8px 16px rgba(30,40,70,0.15)", border: `6px solid ${C.navySurface}` }}>
        <svg width={138} height={72} viewBox="0 0 138 72">
          <polyline points="6,60 30,40 48,50 74,16 96,34 130,52" fill="none" stroke={C.blue} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {/* clock */}
      <svg width={90} height={90} viewBox="0 0 90 90" style={{ position: "absolute", left: 345, top: -4 }}>
        <circle cx={45} cy={45} r={40} fill="#fff" stroke={C.navySurface} strokeWidth={6} />
        <line x1={45} y1={45} x2={45} y2={18} stroke={C.navySurface} strokeWidth={4} strokeLinecap="round" transform={`rotate(${sec * 0.5 + 60} 45 45)`} />
        <line x1={45} y1={45} x2={45} y2={10} stroke={C.blue} strokeWidth={2.5} strokeLinecap="round" transform={`rotate(${minuteA} 45 45)`} />
        <circle cx={45} cy={45} r={4} fill={C.navySurface} />
      </svg>
      {/* brand sign on the wall, above the screen */}
      <div style={{ position: "absolute", left: 760, top: 14, padding: "10px 26px", borderRadius: 12, background: "rgba(255,255,255,0.8)", boxShadow: "0 6px 14px rgba(30,40,70,0.12)" }}>
        <Wordmark width={190} color="#0E1C29" style={{ opacity: 0.8 }} />
      </div>
      {/* window onto the mountains */}
      <div style={{ position: "absolute", left: 50, top: 90, width: 500, height: 640, borderRadius: 10, overflow: "hidden", background: "linear-gradient(180deg, #9FB8F2 0%, #D6E3FA 62%, #F4EAD8 100%)", boxShadow: "inset 0 0 0 14px #FFFFFF, 0 10px 26px rgba(30,40,70,0.16)" }}>
        <div style={{ position: "absolute", left: 350, top: 60, width: 90, height: 90, borderRadius: "50%", background: "radial-gradient(circle, #FFF6D0, rgba(255,235,160,0.0) 70%)" }} />
        {[0, 1].map((k) => (
          <div key={k} style={{ position: "absolute", left: cloudX - 260 + k * 420, top: 18 + k * 44, width: 140, height: 36, borderRadius: 30, background: "rgba(255,255,255,0.88)" }} />
        ))}
        <svg width={500} height={640} style={{ position: "absolute", left: 0, top: 0 }}>
          <path d="M-20 640 L90 360 L150 420 L260 250 L360 400 L420 330 L540 640 Z" fill="#A4B7FD" opacity={0.85} />
          <path d="M-20 640 L60 470 L140 520 L230 400 L330 520 L430 450 L540 640 Z" fill={C.blue} opacity={0.75} />
          <path d="M260 250 L228 310 L250 304 L262 336 L282 304 L300 316 Z" fill="#fff" />
          {farBuildings.map((b, i) => (
            <rect key={`f${i}`} x={b.x + 14} y={640 - b.h * 0.4 - 30} width={b.w} height={b.h * 0.4 + 30} fill="#B7C6DE" opacity={0.0} />
          ))}
          {buildings.map((b, i) => (
            <rect key={i} x={b.x} y={640 - b.h * 0.15} width={b.w} height={b.h * 0.15} fill={i % 2 ? "#7F93B5" : "#93A6C4"} opacity={0.0} />
          ))}
        </svg>
        <div style={{ position: "absolute", left: 243, top: 0, width: 14, height: 640, background: "#FFFFFF" }} />
        <div style={{ position: "absolute", left: 0, top: 300, width: 500, height: 12, background: "#FFFFFF" }} />
        <div style={{ position: "absolute", left: -40, top: -60, width: 300, height: 900, rotate: "24deg", background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.22), rgba(255,255,255,0))" }} />
      </div>
      <div style={{ position: "absolute", left: 120, top: 900, width: 520, height: 380, background: "linear-gradient(180deg, rgba(255,247,220,0.5), rgba(255,247,220,0))", transform: "skewX(-30deg)" }} />
      {/* floor */}
      <div style={{ position: "absolute", left: -300, top: 900, width: 2520, height: 400, background: "linear-gradient(180deg, #C9A07A, #A47A52)" }} />
      <svg width={2520} height={400} style={{ position: "absolute", left: -300, top: 900 }}>
        {Array.from({ length: 22 }, (_, i) => (
          <line key={i} x1={i * 130} y1={0} x2={i * 130 - 120} y2={400} stroke="#8F6A44" strokeWidth={2} opacity={0.45} />
        ))}
      </svg>
      <div style={{ position: "absolute", left: -300, top: 892, width: 2520, height: 12, background: "#F7F4EF" }} />
      {/* plant */}
      <svg width={160} height={260} viewBox="0 0 160 260" style={{ position: "absolute", left: 1780, top: 700 }}>
        {[-40, -18, 0, 20, 42].map((a, i) => (
          <ellipse key={i} cx={80} cy={90} rx={18} ry={70} fill={i % 2 ? "#3E9B6E" : "#2F8560"} transform={`rotate(${a + Math.sin(f / 40 + i) * 2.5} 80 160)`} />
        ))}
        <path d="M44 160 L116 160 L106 250 L54 250 Z" fill="#E8DCCB" />
        <path d="M44 160 L116 160 L114 176 L46 176 Z" fill="#D8CAB4" />
      </svg>
    </>
  );
};

const Swipe: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const f = useCurrentFrame();
  const inP = tw(f, 0, 18, 0, 1);
  const outP = tw(f, dur - 10, dur, 0, 1, Easing.in(Easing.cubic));
  return (
    <AbsoluteFill style={{ opacity: inP * (1 - outP), translate: `${(1 - inP) * 150 - outP * 170}px 0px`, scale: 0.95 + 0.05 * inP + 0.03 * outP, filter: inP < 0.98 || outP > 0 ? `blur(${(1 - inP) * 10 + outP * 10}px)` : undefined }}>
      {children}
    </AbsoluteFill>
  );
};

const Screen: React.FC = () => {
  const f = useCurrentFrame();
  const on = tw(f, s(0.4), s(0.8), 0, 1);
  const chapter = SCENES.findIndex((t, i) => f >= s(t) && f < s(SCENES[i + 1] ?? 999));
  return (
    <>
      <div style={{ position: "absolute", left: SCREEN.x + SCREEN.w / 2 - 70, top: SCREEN.y + SCREEN.h - 4, width: 140, height: 40, background: `linear-gradient(180deg, ${C.navySurface2}, ${C.navySurface})` }} />
      <div style={{ position: "absolute", left: SCREEN.x + SCREEN.w / 2 - 190, top: SCREEN.y + SCREEN.h + 32, width: 380, height: 18, borderRadius: 9, background: C.navySurface }} />
      <div style={{ position: "absolute", left: SCREEN.x, top: SCREEN.y, width: SCREEN.w, height: SCREEN.h, borderRadius: 26, background: `linear-gradient(160deg, ${C.navySurface2}, ${C.navyDeep})`, boxShadow: "0 34px 70px rgba(20,25,50,0.34), 0 0 0 2px #3A4066 inset" }} />
      <div style={{ position: "absolute", left: SCREEN.x + SCREEN.w / 2 - 5, top: SCREEN.y + 8, width: 10, height: 10, borderRadius: 5, background: on > 0.5 ? C.gain : "#454B73" }} />
      <div style={{ position: "absolute", left: INNER.x, top: INNER.y, width: INNER.w, height: INNER.h, borderRadius: 12, overflow: "hidden", background: on > 0 ? C.frame : C.navyDeep }}>
        <div style={{ width: VW, height: VH, scale: "0.8", transformOrigin: "0 0", position: "absolute", left: 0, top: 0, opacity: on }}>
          <Backdrop />
          {SCENE_COMPONENTS.map((Comp, i) => {
            const from = s(SCENES[i]);
            const dur = s(SCENES[i + 1]) - from;
            return (
              <Sequence key={i} from={from} durationInFrames={dur} name={`Scene ${i + 1}`} layout="none">
                <Swipe dur={dur}>
                  <Comp />
                </Swipe>
              </Sequence>
            );
          })}
          <div style={{ position: "absolute", left: 40, top: VH - 58, opacity: 0.28 }}>
            <Wordmark width={120} color="#0E1C29" />
          </div>
          <div style={{ position: "absolute", right: 40, top: 40, display: "flex", gap: 10 }}>
            {SCENE_COMPONENTS.map((_, i) => (
              <div key={i} style={{ width: i === chapter ? 40 : 12, height: 12, borderRadius: 6, background: i <= chapter ? C.blue : C.hairline }} />
            ))}
          </div>
        </div>
        <div style={{ position: "absolute", inset: 0, background: "#FFFFFF", opacity: interpolate(f, [s(0.4), s(0.5), s(1)], [0, 0.9, 0], clamp) }} />
      </div>
      <div style={{ position: "absolute", left: INNER.x, top: INNER.y, width: INNER.w, height: INNER.h, borderRadius: 12, background: "linear-gradient(120deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 38%)" }} />
    </>
  );
};

// ---------------- Presenter ----------------
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpPt = (a: [number, number], b: [number, number], t: number): [number, number] => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const blendArms = (a: ArmSet, b: ArmSet, t: number): ArmSet => ({ le: lerpPt(a.le, b.le, t), lh: lerpPt(a.lh, b.lh, t), re: lerpPt(a.re, b.re, t), rh: lerpPt(a.rh, b.rh, t) });
const leanOf = (p: AdvisorPose) => (p === "point" || p === "present" ? 3 : p === "think" ? -2 : 0);

const Presenter: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / FPS;
  let idx = -1;
  for (let i = 0; i < SUBS.length; i++) if (t >= SUBS[i].from - 0.15) idx = i;
  const cur = idx >= 0 ? SUBS[idx] : null;
  const prevPose: AdvisorPose = idx > 0 ? SUBS[idx - 1].pose : "idle";
  const curPose: AdvisorPose = cur ? cur.pose : "idle";
  const startF = cur ? s(cur.from - 0.15) : 0;
  const blend = cur ? spring({ frame: f - startF, fps, config: { damping: 12, stiffness: 150 } }) : 1;
  let arms = blendArms(ADVISOR_POSES[prevPose], ADVISOR_POSES[curPose], blend);
  const speaking = cur !== null && t < cur.to - 0.2;
  if (speaking) {
    const dx = Math.sin(f / 7) * 6;
    const dy = Math.sin(f / 5.5) * 7;
    if (curPose === "explain" || curPose === "welcome") arms = { ...arms, lh: [arms.lh[0] - dx, arms.lh[1] + dy], rh: [arms.rh[0] + dx, arms.rh[1] - dy] };
    else if (curPose === "point" || curPose === "present") arms = { ...arms, rh: [arms.rh[0] + Math.sin(f / 4.5) * 5, arms.rh[1] + Math.sin(f / 6) * 4] };
    else if (curPose === "count" || curPose === "thumbsUp") arms = { ...arms, rh: [arms.rh[0], arms.rh[1] - Math.abs(Math.sin(f / 6)) * 8] };
  }
  arms = { ...arms, le: [arms.le[0], arms.le[1] + Math.sin(f / 31) * 1.5], re: [arms.re[0], arms.re[1] + Math.sin(f / 29 + 1) * 1.5] };
  const mouth = speaking ? Math.max(0, Math.sin(f * 0.9) * 0.6 + Math.sin(f * 0.33 + 1) * 0.4) : 0;
  const blink = f % 97 < 4 || f % 163 < 3;
  const breath = Math.sin((f / FPS) * Math.PI) * 2;
  const headTilt = Math.sin(f / 23) * 2 + (speaking ? Math.sin(f / 8) * 2 : 0);
  const lean = lerp(leanOf(prevPose), leanOf(curPose), blend);
  const look = curPose === "point" || curPose === "present" ? 3 : 1;
  const enter = spring({ frame: f, fps, config: { damping: 16, stiffness: 80 } });
  const x = interpolate(enter, [0, 1], [-520, 70]);
  const bob = enter < 0.98 ? Math.abs(Math.sin(f / 3)) * -10 : 0;
  const hop = cur && curPose === "thumbsUp" ? -Math.max(0, Math.sin(Math.min(1, (f - startF) / 12) * Math.PI)) * 22 : 0;
  const weight = Math.sin(f / 61) * 6;
  return (
    <div style={{ position: "absolute", left: x + weight, top: 222 + bob + hop }}>
      <Advisor arms={arms} handStyle={blend > 0.5 ? curPose : prevPose} expr={cur ? cur.expr : "happy"} mouth={mouth} blink={blink} breath={breath} headTilt={headTilt} lean={lean} look={look} width={470} />
    </div>
  );
};

// ---------------- Overlays (screen space) ----------------
// Captions: Inter on a navy surface; figures in the one live accent (sky).
const Subtitles: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const cur = SUBS.find((x) => t >= x.from && t < x.to);
  if (!cur) return null;
  const a = s(cur.from);
  const b = s(cur.to);
  const o = interpolate(f, [a, a + 5, b - 4, b], [0, 1, 1, 0], clamp);
  const words = cur.text.split(" ");
  const total = cur.text.length;
  const span = cur.to - cur.from - 0.4;
  let chars = 0;
  return (
    <div style={{ position: "absolute", left: 0, width: 1920, bottom: 56, display: "flex", justifyContent: "center" }}>
      <div style={{ maxWidth: 1560, padding: "16px 38px", borderRadius: 24, background: "rgba(28,33,64,0.94)", border: `2px solid ${C.navyLine}`, boxShadow: "0 20px 44px rgba(10,12,30,0.45)", fontFamily: FONT, fontSize: 42, fontWeight: 600, lineHeight: 1.3, textAlign: "center", opacity: o, translate: `0px ${(1 - o) * 18}px`, scale: interpolate(o, [0, 1], [0.95, 1]) }}>
        {words.map((w, i) => {
          const ws = cur.from + (chars / total) * span;
          chars += w.length + 1;
          const said = t >= ws;
          const isNum = /[$%0-9]/.test(w);
          const pop = said ? interpolate(t - ws, [0, 0.1, 0.24], [1, 1.14, 1], clamp) : 1;
          return (
            <span key={i} style={{ display: "inline-block", marginRight: 15, color: isNum ? C.sky : "#FFFFFF", opacity: said ? 1 : 0.4, scale: `${pop}`, translate: `0px ${said ? 0 : 4}px` }}>
              {w}
            </span>
          );
        })}
      </div>
    </div>
  );
};

const Bursts: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <>
      {BURSTS.map((b) => {
        const st = s(b.at);
        const end = st + s(1.9);
        if (f < st || f > end + 20) return null;
        const sp = spring({ frame: f - st, fps, config: { damping: 8, stiffness: 220 } });
        const out = interpolate(f, [end - 8, end], [1, 0], clamp);
        const shake = !b.good && f - st < 14 ? Math.sin((f - st) * 2.6) * 9 * (1 - (f - st) / 14) : 0;
        return (
          <React.Fragment key={b.at}>
            <div style={{ position: "absolute", right: 70, top: 100, translate: `${shake}px 0px`, rotate: `${interpolate(sp, [0, 1], [-14, -4])}deg`, scale: interpolate(sp, [0, 1], [0.2, 1]) * (0.6 + 0.4 * out), opacity: out }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 40px", borderRadius: 80, background: b.color, color: "#fff", fontFamily: FONT_DISPLAY, fontSize: 62, fontWeight: 600, letterSpacing: "-0.02em", boxShadow: `0 20px 44px ${b.color}66`, whiteSpace: "nowrap" }}>
                {b.check ? <Check size={60} strokeWidth={2.75} color="#fff" /> : null}
                {b.text}
              </div>
            </div>
            {b.good ? <Burst start={st + 2} x={1920 - 70 - 250} y={170} count={20} power={260} /> : null}
          </React.Fragment>
        );
      })}
    </>
  );
};

const HelpChip: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const cur = HELP.find((h) => t >= h.from && t < h.to);
  if (!cur) return null;
  const a = s(cur.from);
  const b = s(cur.to);
  const inP = tw(f, a, a + 16, 0, 1);
  const outP = tw(f, b - 8, b, 0, 1);
  return (
    <div style={{ position: "absolute", left: 50, top: 50, translate: `${(1 - inP) * -760 - outP * 760}px 0px`, display: "flex", alignItems: "stretch", borderRadius: 20, overflow: "hidden", boxShadow: "0 18px 38px rgba(20,20,40,0.36)" }}>
      <div style={{ background: C.blue, color: "#fff", fontFamily: FONT_DISPLAY, fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em", padding: "16px 24px", display: "flex", alignItems: "center" }}>How we help</div>
      <div style={{ background: C.navySurface, color: C.ice, fontFamily: FONT, fontSize: 34, fontWeight: 500, padding: "16px 28px", whiteSpace: "nowrap", position: "relative" }}>
        {cur.text}
        <div style={{ position: "absolute", left: 0, bottom: 0, height: 5, width: `${tw(f, a, b, 0, 100, (x) => x)}%`, background: C.sky }} />
      </div>
    </div>
  );
};

// Chapter wipe: the curtain drops to navy (DESIGN.md), led by two accent bands.
const ChapterWipe: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      {SCENES.slice(1, -1).map((sec, i) => {
        const mid = s(sec);
        const a = mid - 13;
        const b = mid + 13;
        if (f < a || f > b + 8) return null;
        const label = CHAPTERS[i + 1];
        const band = (k: number) => {
          const p = interpolate(f, [a + k * 3, b + k * 3], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
          return interpolate(p, [0, 1], [-2700, 2700]);
        };
        const textP = interpolate(f, [mid - 8, mid, mid + 8], [0, 1, 0], clamp);
        return (
          <React.Fragment key={sec}>
            <div style={{ position: "absolute", left: band(2) - 400, top: -100, width: 2720, height: 1280, transform: "skewX(-14deg)", background: C.lavender }} />
            <div style={{ position: "absolute", left: band(1) - 400, top: -100, width: 2720, height: 1280, transform: "skewX(-14deg)", background: C.blueBright }} />
            <div style={{ position: "absolute", left: band(0) - 400, top: -100, width: 2720, height: 1280, transform: "skewX(-14deg)", background: C.navyDeep, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ transform: "skewX(14deg)", color: "#fff", fontFamily: FONT_DISPLAY, fontSize: 104, fontWeight: 600, letterSpacing: "-0.02em", display: "flex", gap: 30, alignItems: "baseline", opacity: textP, translate: `${(1 - textP) * 60}px 0px` }}>
                <span style={{ color: C.sky }}>{String(i + 1).padStart(2, "0")}</span>
                {label}
              </div>
              <div style={{ position: "absolute", bottom: 150, transform: "skewX(14deg)", opacity: textP * 0.7 }}>
                <Wordmark width={170} color="#FFFFFF" />
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </>
  );
};

// ---------------- Camera ----------------
const shotAt = (f: number) => {
  let i = 0;
  for (let k = 0; k < SHOTS.length; k++) if (f >= s(SHOTS[k].at)) i = k;
  const cur = SHOT_PARAMS[SHOTS[i].shot];
  const prev = SHOT_PARAMS[SHOTS[Math.max(0, i - 1)].shot];
  const start = s(SHOTS[i].at);
  const p = i === 0 ? 1 : interpolate(f, [start, start + 22], [0, 1], { ...clamp, easing: Easing.bezier(0.65, 0, 0.35, 1) });
  const sinceCut = f - start;
  return {
    cx: lerp(prev.cx, cur.cx, p),
    cy: lerp(prev.cy, cur.cy, p),
    sc: lerp(prev.sc, cur.sc, p) * (1 + Math.min(sinceCut, 180) * 0.00022),
    move: p < 1 ? Math.sin(p * Math.PI) : 0,
  };
};

const Content: React.FC = () => {
  const f = useCurrentFrame();
  const cam = shotAt(f);
  const driftX = Math.sin(f / 47) * 6 + Math.sin(f / 19) * 1.5;
  const driftY = Math.cos(f / 61) * 5 + Math.cos(f / 23) * 1.5;
  const tx = 960 - cam.cx * cam.sc + driftX;
  const ty = 540 - cam.cy * cam.sc + driftY;
  const roll = Math.sin(f / 70) * 0.18 + cam.move * 0.5;
  return (
    <AbsoluteFill style={{ fontFamily: FONT, background: "#DFE6EF", overflow: "hidden" }}>
      <AbsoluteFill style={{ transformOrigin: "0 0", translate: `${tx}px ${ty}px`, scale: `${cam.sc}` }}>
        <AbsoluteFill style={{ transformOrigin: "960px 540px", rotate: `${roll}deg`, filter: cam.move > 0.05 ? `blur(${cam.move * 2.2}px)` : undefined }}>
          <Office />
          <Screen />
          <Presenter />
        </AbsoluteFill>
      </AbsoluteFill>
      {Array.from({ length: 10 }, (_, i) => {
        const x = random(`dx${i}`) * 1920;
        const y0 = random(`dy${i}`) * 1080;
        const y = (((y0 - f * (0.3 + random(`dv${i}`) * 0.4)) % 1080) + 1080) % 1080;
        return <div key={i} style={{ position: "absolute", left: x + Math.sin(f / 50 + i) * 20, top: y, width: 5, height: 5, borderRadius: "50%", background: "rgba(255,255,255,0.7)" }} />;
      })}
      <HelpChip />
      <Bursts />
      <Subtitles />
      <ChapterWipe />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 58%, rgba(15,18,40,0.26) 100%)", pointerEvents: "none" }} />
      <SfxContent cuts={CUTS} />
    </AbsoluteFill>
  );
};

export const Video3: React.FC = () => (
  <AbsoluteFill style={{ background: C.navyDeep }}>
    <Sequence from={CONTENT_FROM} durationInFrames={CONTENT_DURATION} name="Video" layout="none">
      <Content />
    </Sequence>
    <Sequence from={0} durationInFrames={APERTURA} name="Apertura" layout="none">
      <SceneApertura />
      <SfxApertura />
    </Sequence>
    <Sequence from={OUTRO_FROM} durationInFrames={CIERRE} name="Cierre" layout="none">
      <SceneCierre />
      <SfxCierre />
    </Sequence>
  </AbsoluteFill>
);
