import React from "react";
import { AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

// Shared timing, palette, animation helpers and screen components for every scene (Video 2.0).
const { fontFamily } = loadFont("normal", { weights: ["500", "600", "700", "800", "900"], subsets: ["latin"] });

export const FPS = 30;
export const s = (sec: number) => Math.round(sec * FPS);
export const C = {
  ink: "#1B1F3B",
  muted: "#5F668A",
  card: "#FFFFFF",
  panel: "#F4F7FD",
  green: "#1FB58A",
  greenSoft: "#D5F4EA",
  red: "#EE4B55",
  redSoft: "#FFE0E2",
  blue: "#3B7DDD",
  blueSoft: "#DCE9FB",
  orange: "#F58B2C",
  yellow: "#FFC23D",
  purple: "#6C4BD6",
  grey: "#DADDEA",
  cyan: "#2C9BD6",
};
export const FONT = `${fontFamily}, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`;
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const ease = Easing.bezier(0.16, 1, 0.3, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
export const tw = (f: number, a: number, b: number, from: number, to: number, e: (t: number) => number = ease) =>
  interpolate(f, [a, b], [from, to], { ...clamp, easing: e });

export const useSpring = (delay = 0, damping = 14, stiffness = 150) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: f - delay, fps, config: { damping, stiffness } });
};
export const VW = 1500;
export const VH = 900;

// ---------------- Background of the presentation screen ----------------
export const Backdrop: React.FC = () => {
  const f = useCurrentFrame();
  const blobs = [
    { x: 150, y: 120, r: 520, c: "rgba(59,125,221,0.16)", sp: 0.011 },
    { x: 1250, y: 200, r: 480, c: "rgba(108,75,214,0.14)", sp: 0.009 },
    { x: 900, y: 820, r: 560, c: "rgba(31,181,138,0.12)", sp: 0.013 },
  ];
  return (
    <AbsoluteFill style={{ background: "linear-gradient(160deg, #F8FAFF 0%, #EAF0FB 100%)" }}>
      {blobs.map((b, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: b.x - b.r + Math.sin(f * b.sp + i * 2) * 70,
            top: b.y - b.r + Math.cos(f * b.sp * 1.2 + i) * 60,
            width: b.r * 2,
            height: b.r * 2,
            borderRadius: "50%",
            background: `radial-gradient(closest-side, ${b.c}, rgba(255,255,255,0))`,
          }}
        />
      ))}
      <svg width={VW} height={VH} style={{ position: "absolute", opacity: 0.55 }}>
        <defs>
          <pattern id="dots" width="44" height="44" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="2.2" fill="#B8C3DE" />
          </pattern>
        </defs>
        <rect width={VW} height={VH} fill="url(#dots)" />
      </svg>
      {Array.from({ length: 14 }, (_, i) => {
        const x = random(`px${i}`) * VW;
        const y0 = random(`py${i}`) * VH;
        const sp = 0.25 + random(`ps${i}`) * 0.4;
        const y = (((y0 - f * sp) % VH) + VH) % VH;
        const sz = 6 + random(`pz${i}`) * 10;
        return <div key={i} style={{ position: "absolute", left: x + Math.sin(f / 40 + i) * 18, top: y, width: sz, height: sz, borderRadius: "50%", background: i % 3 === 0 ? "rgba(255,194,61,0.5)" : "rgba(59,125,221,0.28)" }} />;
      })}
    </AbsoluteFill>
  );
};

// ---------------- Screen content helpers ----------------
export const Heading: React.FC<{ kicker: string; title: string }> = ({ kicker, title }) => {
  const f = useCurrentFrame();
  const sp = useSpring(2, 16);
  const words = title.split(" ");
  return (
    <div style={{ position: "absolute", left: 70, top: 46 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, opacity: Math.min(1, sp), translate: `${interpolate(sp, [0, 1], [-60, 0])}px 0px` }}>
        <div style={{ width: interpolate(sp, [0, 1], [0, 46]), height: 6, borderRadius: 3, background: `linear-gradient(90deg, ${C.blue}, ${C.purple})` }} />
        <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: 6, color: C.blue }}>{kicker}</div>
      </div>
      <div style={{ display: "flex", gap: 16, fontSize: 62, fontWeight: 900, color: C.ink, letterSpacing: -1, marginTop: 2 }}>
        {words.map((w, i) => {
          const p = tw(f, 6 + i * 3, 22 + i * 3, 0, 1);
          return (
            <span key={i} style={{ display: "inline-block", opacity: p, translate: `0px ${(1 - p) * 34}px`, filter: `blur(${(1 - p) * 8}px)` }}>
              {w}
            </span>
          );
        })}
      </div>
      <div style={{ width: tw(f, 14, 40, 0, 190), height: 7, borderRadius: 4, background: `linear-gradient(90deg, ${C.blue}, ${C.purple})`, marginTop: 8 }} />
    </div>
  );
};

export const Pop: React.FC<{ delay: number; style?: React.CSSProperties; children: React.ReactNode; from?: "up" | "left" | "right" | "scale" }> = ({ delay, style, children, from = "up" }) => {
  const sp = useSpring(delay, 13, 140);
  const off = interpolate(sp, [0, 1], [70, 0]);
  const translate = from === "up" ? `0px ${off}px` : from === "left" ? `${-off}px 0px` : from === "right" ? `${off}px 0px` : "0px 0px";
  return (
    <div
      style={{
        position: "absolute",
        opacity: Math.min(1, sp * 1.6),
        translate,
        scale: from === "scale" ? interpolate(sp, [0, 1], [0.55, 1]) : undefined,
        filter: sp < 0.95 ? `blur(${(1 - Math.min(1, sp)) * 7}px)` : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const cardStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, #FFFFFF 0%, #FAFBFE 100%)",
  borderRadius: 28,
  boxShadow: "0 22px 44px rgba(31,35,64,0.12), 0 2px 0 rgba(255,255,255,0.9) inset, 0 0 0 1.5px rgba(31,35,64,0.04)",
};

// Looping shine that sweeps across a card.
export const Shine: React.FC<{ start: number; radius?: number }> = ({ start, radius = 28 }) => {
  const f = useCurrentFrame();
  const p = tw(f, start, start + 26, -0.3, 1.3, easeInOut);
  return (
    <div style={{ position: "absolute", inset: 0, borderRadius: radius, overflow: "hidden", pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: -40, bottom: -40, width: 90, left: `${p * 100}%`, rotate: "18deg", background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.75), rgba(255,255,255,0))" }} />
    </div>
  );
};

// Deterministic burst of confetti / sparks around a point.
export const Burst: React.FC<{ start: number; x: number; y: number; colors?: string[]; count?: number; power?: number }> = ({ start, x, y, colors = [C.yellow, C.green, C.blue, C.purple, C.orange], count = 22, power = 230 }) => {
  const f = useCurrentFrame();
  const t = (f - start) / 34;
  if (t < 0 || t > 1.2) return null;
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const ang = (i / count) * Math.PI * 2 + random(`ba${i}`) * 0.6;
        const dist = power * (0.45 + random(`bd${i}`) * 0.7) * (1 - Math.pow(1 - Math.min(1, t), 3));
        const g = Math.max(0, t) * Math.max(0, t) * 70;
        const sz = 8 + random(`bs${i}`) * 10;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + Math.cos(ang) * dist - sz / 2,
              top: y + Math.sin(ang) * dist + g - sz / 2,
              width: sz,
              height: i % 2 ? sz : sz * 0.5,
              borderRadius: i % 3 === 0 ? "50%" : 3,
              background: colors[i % colors.length],
              opacity: 1 - Math.max(0, t - 0.6) / 0.6,
              rotate: `${t * 420 * (i % 2 ? 1 : -1)}deg`,
            }}
          />
        );
      })}
    </>
  );
};

// ---------------- Brand logo (licensed SVG, 7 letter paths from SVG/Mesa de trabajo 1.svg) ----------------
export const LOGO_PATHS: string[] = [
  "M559.57,398.85l-22.84,22.84c-9.28-9.19-17.71-13.79-25.27-13.79-4.15,0-7.39.88-9.73,2.63-2.34,1.76-3.51,3.94-3.51,6.56,0,1.98.74,3.81,2.23,5.47,1.49,1.67,5.16,3.94,11.02,6.83l13.52,6.76c14.24,7.03,24.01,14.19,29.33,21.49,5.32,7.3,7.97,15.86,7.97,25.68,0,13.07-4.8,23.97-14.39,32.71-9.6,8.74-22.46,13.11-38.59,13.11-21.45,0-38.57-8.38-51.36-25.14l22.71-24.73c4.33,5.05,9.39,9.12,15.21,12.23,5.81,3.11,10.97,4.66,15.48,4.66,4.87,0,8.79-1.17,11.76-3.51,2.97-2.34,4.46-5.04,4.46-8.11,0-5.68-5.36-11.22-16.08-16.62l-12.43-6.22c-23.79-11.98-35.68-26.98-35.68-45.01,0-11.62,4.48-21.56,13.45-29.8,8.96-8.24,20.43-12.37,34.4-12.37,9.55,0,18.54,2.09,26.96,6.28,8.42,4.19,15.56,10.2,21.42,18.04Z",
  "M592.56,332.95l35.54-11.41v71.63c7.21-6.22,14.46-10.88,21.76-13.99,7.3-3.11,14.69-4.66,22.17-4.66,14.6,0,26.9,5.05,36.9,15.14,8.56,8.74,12.84,21.58,12.84,38.52v97.18h-36.36v-64.47c0-17.03-.81-28.56-2.43-34.6-1.62-6.04-4.39-10.54-8.31-13.52-3.92-2.97-8.76-4.46-14.53-4.46-7.48,0-13.9,2.48-19.26,7.43-5.36,4.96-9.08,11.71-11.15,20.27-1.08,4.42-1.62,14.51-1.62,30.28v59.06h-36.63c.36-64.14.73-128.27,1.09-192.41Z",
  "M904.76,462.51h-118.53c1.71,10.45,6.28,18.77,13.72,24.94,7.43,6.17,16.92,9.26,28.45,9.26,13.79,0,25.63-4.82,35.55-14.46l31.09,14.6c-7.75,10.99-17.03,19.12-27.84,24.4-10.81,5.27-23.65,7.91-38.52,7.91-23.07,0-41.85-7.28-56.36-21.83-14.51-14.55-21.76-32.78-21.76-54.67s7.23-41.06,21.69-55.89c14.46-14.82,32.59-22.23,54.4-22.23,23.16,0,41.99,7.41,56.5,22.23,14.51,14.82,21.76,34.4,21.76,58.73l-.14,7.03ZM867.86,433.45c-2.44-8.2-7.24-14.87-14.42-20s-15.5-7.7-24.98-7.7c-10.29,0-19.31,2.88-27.08,8.65-4.87,3.6-9.39,9.96-13.54,19.06h80.01Z",
  "M925.98,378.3h31.63v18.52c3.42-7.3,7.97-12.84,13.65-16.62,5.68-3.78,11.89-5.68,18.65-5.68,4.78,0,9.78,1.26,15,3.78l-11.49,31.76c-4.33-2.16-7.89-3.24-10.68-3.24-5.68,0-10.47,3.51-14.39,10.54-3.92,7.03-5.88,20.81-5.88,41.36l.13,7.16v59.47h-36.63v-147.05Z",
  "M1059.79,378.3v16.22c6.67-6.67,13.88-11.67,21.62-15,7.75-3.33,16.04-5,24.87-5,19.19,0,35.5,7.25,48.93,21.76,13.42,14.51,20.14,33.11,20.14,55.82s-6.94,40.21-20.81,54.94c-13.88,14.73-30.32,22.1-49.33,22.1-8.47,0-16.35-1.51-23.65-4.53-7.3-3.02-14.55-7.95-21.76-14.8-.2,19.85-.39,39.71-.59,59.56-12.01,3.26-24.03,6.52-36.04,9.77v-200.84h36.63ZM1098.58,408.58c-11.62,0-21.27,3.97-28.92,11.89-7.66,7.93-11.49,18.29-11.49,31.09s3.83,23.63,11.49,31.69c7.66,8.07,17.3,12.1,28.92,12.1s20.75-4.1,28.45-12.3c7.7-8.2,11.56-18.65,11.56-31.36s-3.79-22.95-11.35-31.02c-7.57-8.06-17.12-12.1-28.65-12.1Z",
  "M1314.42,378.3h36.9v147.05h-36.9v-15.54c-7.2,6.85-14.42,11.78-21.67,14.8-7.25,3.02-15.1,4.53-23.56,4.53-18.99,0-35.42-7.37-49.28-22.1-13.86-14.73-20.79-33.05-20.79-54.94s6.71-41.31,20.12-55.82c13.41-14.51,29.7-21.76,48.87-21.76,8.82,0,17.1,1.67,24.84,5,7.74,3.33,14.9,8.34,21.47,15v-16.22ZM1275.64,408.58c-11.41,0-20.88,4.03-28.42,12.1-7.54,8.07-11.32,18.41-11.32,31.02s3.84,23.16,11.52,31.36c7.68,8.2,17.13,12.3,28.36,12.3s21.19-4.03,28.83-12.1c7.63-8.06,11.45-18.63,11.45-31.69s-3.82-23.16-11.45-31.09c-7.63-7.93-17.29-11.89-28.96-11.89Z",
  "M1478.64,398.85l-22.84,22.84c-9.28-9.19-17.71-13.79-25.27-13.79-4.15,0-7.39.88-9.73,2.63-2.34,1.76-3.51,3.94-3.51,6.56,0,1.98.74,3.81,2.23,5.47,1.49,1.67,5.16,3.94,11.02,6.83l13.52,6.76c14.24,7.03,24.01,14.19,29.33,21.49,5.32,7.3,7.97,15.86,7.97,25.68,0,13.07-4.8,23.97-14.39,32.71-9.6,8.74-22.46,13.11-38.59,13.11-21.45,0-38.57-8.38-51.36-25.14l22.71-24.73c4.33,5.05,9.39,9.12,15.21,12.23,5.81,3.11,10.97,4.66,15.48,4.66,4.87,0,8.79-1.17,11.76-3.51,2.97-2.34,4.46-5.04,4.46-8.11,0-5.68-5.36-11.22-16.08-16.62l-12.43-6.22c-23.79-11.98-35.68-26.98-35.68-45.01,0-11.62,4.48-21.56,13.45-29.8,8.96-8.24,20.43-12.37,34.4-12.37,9.55,0,18.54,2.09,26.96,6.28,8.42,4.19,15.56,10.2,21.42,18.04Z",
];
const LOGO_X = 465;
const LOGO_Y = 314;
const LOGO_W = 1020;
const LOGO_H = 282;
export const LOGO_ASPECT = LOGO_H / LOGO_W;

// Static, single-colour logo (used as a subtle watermark).
export const Logo: React.FC<{ width: number; color?: string; style?: React.CSSProperties }> = ({ width, color = "#FFFFFF", style }) => (
  <svg viewBox={`${LOGO_X} ${LOGO_Y} ${LOGO_W} ${LOGO_H}`} width={width} height={width * LOGO_ASPECT} style={{ overflow: "visible", display: "block", ...style }}>
    {LOGO_PATHS.map((d, i) => (
      <path key={i} d={d} fill={color} />
    ))}
  </svg>
);

// Letter-by-letter rise with a light sheen sweeping across (used by intro and outro).
export const AnimatedLogo: React.FC<{ width: number; start: number; sheen: number; id: string }> = ({ width, start, sheen, id }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = tw(f, sheen, sheen + 30, 0, 1, easeInOut);
  const gx = LOGO_X - 420 + (LOGO_W + 840) * p;
  return (
    <svg viewBox={`${LOGO_X} ${LOGO_Y} ${LOGO_W} ${LOGO_H}`} width={width} height={width * LOGO_ASPECT} style={{ overflow: "visible", display: "block", filter: "drop-shadow(0 0 26px rgba(120,160,255,0.35))" }}>
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={gx} y1={LOGO_Y} x2={gx + 420} y2={LOGO_Y + 120}>
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.5" stopColor="#8FB8FF" />
          <stop offset="1" stopColor="#FFFFFF" />
        </linearGradient>
      </defs>
      {LOGO_PATHS.map((d, i) => {
        const sp = spring({ frame: f - (start + i * 4), fps, config: { damping: 15, stiffness: 120 } });
        return (
          <g key={i} transform={`translate(0 ${(1 - sp) * 80})`} opacity={Math.min(1, sp * 1.5)} style={{ filter: sp < 0.97 ? `blur(${(1 - Math.min(1, sp)) * 10}px)` : undefined }}>
            <path d={d} fill={`url(#${id})`} />
          </g>
        );
      })}
    </svg>
  );
};

export const LogoBackdrop: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, #232A5C 0%, #131736 55%, #0B0E24 100%)" }}>
      {[
        { x: 480, y: 330, r: 520, c: "rgba(59,125,221,0.28)" },
        { x: 1480, y: 760, r: 560, c: "rgba(108,75,214,0.26)" },
      ].map((b, i) => (
        <div key={i} style={{ position: "absolute", left: b.x - b.r + Math.sin(f / 45 + i * 3) * 50, top: b.y - b.r + Math.cos(f / 52 + i) * 40, width: b.r * 2, height: b.r * 2, borderRadius: "50%", background: `radial-gradient(closest-side, ${b.c}, rgba(0,0,0,0))` }} />
      ))}
      {Array.from({ length: 26 }, (_, i) => {
        const x = random(`lx${i}`) * 1920;
        const y0 = random(`ly${i}`) * 1080;
        const y = (((y0 - f * (0.3 + random(`lv${i}`) * 0.7)) % 1080) + 1080) % 1080;
        const sz = 3 + random(`lz${i}`) * 5;
        return <div key={i} style={{ position: "absolute", left: x + Math.sin(f / 40 + i) * 16, top: y, width: sz, height: sz, borderRadius: "50%", background: i % 4 === 0 ? "rgba(255,194,61,0.7)" : "rgba(160,190,255,0.5)" }} />;
      })}
    </AbsoluteFill>
  );
};
