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
