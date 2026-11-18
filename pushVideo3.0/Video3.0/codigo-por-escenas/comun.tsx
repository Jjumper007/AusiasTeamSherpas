import React from "react";
import type { LucideIcon } from "lucide-react";
import { AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

// Shared timing, Sherpas design tokens (diseñoSherpas/sherpas-tokens.css), animation helpers and brand art for every scene (Video 3.0).
// Light "app" world inside the presentation screen, navy "hero" world for the logo scenes and the summit tracker.
const poppins = loadPoppins("normal", { weights: ["500", "600"], subsets: ["latin"] });
const inter = loadInter("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });

export const FPS = 30;
export const s = (sec: number) => Math.round(sec * FPS);

// Roles from sherpas-tokens.css (--sh-*) and the app chart palette (--app-chart-*).
export const C = {
  // light world
  frame: "#F8FAFD",
  raised: "#FFFFFF",
  hairline: "#E2E5EB",
  chipTrack: "#EFF1F5",
  ink: "#141419",
  ink2: "#5F6480",
  ink3: "#7F8399",
  blue: "#4565D6",
  bluePress: "#1C45D7",
  blueWash: "#EFF5FF",
  blueLine: "#C6D2FD",
  // navy world
  navy: "#161827",
  navyDeep: "#0B0F2E",
  navyGlow: "#222852",
  navySurface: "#1C2140",
  navySurface2: "#262C52",
  navyLine: "#2F365E",
  ice: "#E0EEFF",
  navyMuted: "#9EA6C4",
  // accents
  blueBright: "#6586FC",
  sky: "#61A9FA",
  lavender: "#948DF7",
  lagoon: "#2EC4C6",
  // status
  success: "#1DAE53",
  warning: "#E38F10",
  error: "#F04545",
  gold: "#DBAE3A",
  gain: "#3FD27A",
  // mountain palette
  mtnFar: "#283063",
  mtnNear: "#1B2146",
  mtnRock: "#46519A",
  mtnRockLit: "#5F6CB8",
  mtnIce: "#7F97D9",
  // categorical chart colours (app)
  chartTaxes: "#717390",
  chartRent: "#ED8E00",
  chartLiving: "#DBAE3A",
  chartDebt: "#CC3A3A",
  chartSavings: "#178C42",
  chartPurple: "#5353C8",
  chartTeal: "#2EC4C6",
};
export const FONT_DISPLAY = `${poppins.fontFamily}, system-ui, sans-serif`;
export const FONT = `${inter.fontFamily}, system-ui, -apple-system, 'Segoe UI', sans-serif`;
export const CTA_GRADIENT = "linear-gradient(127deg, #948DF7 11%, #4565D6 119%)";
export const STAGE_BG = "radial-gradient(110% 90% at 18% 0%, #222852 0%, #161827 48%, #0B0F2E 100%)";
export const TRACK = -0.02; // em, Poppins titles
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

export const display = (size: number, color: string = C.ink, extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontFamily: FONT_DISPLAY,
  fontWeight: 600,
  fontSize: size,
  letterSpacing: `${TRACK}em`,
  lineHeight: 1.1,
  color,
  ...extra,
});
export const figure = (size: number, color: string = C.ink, extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontFamily: FONT_DISPLAY,
  fontWeight: 600,
  fontSize: size,
  letterSpacing: "-0.035em",
  lineHeight: 0.92,
  fontVariantNumeric: "tabular-nums",
  color,
  ...extra,
});
export const body = (size: number, color: string = C.ink2, weight = 400, extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontFamily: FONT,
  fontWeight: weight,
  fontSize: size,
  lineHeight: 1.35,
  color,
  ...extra,
});

// Light card: raised white, hairline border, the app's soft "row" shadow (DESIGN.md).
export const cardStyle: React.CSSProperties = {
  background: C.raised,
  borderRadius: 32,
  border: `2px solid ${C.hairline}`,
  boxShadow: "0 12px 4px -8px #1414190A, 0 16px 28px -12px rgba(20,20,25,0.16), inset 0 -2px 0 #14141926",
};

// ---------------- Background of the presentation screen: app frame with drifting topographic contours ----------------
export const Backdrop: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.frame }}>
      <svg width={VW} height={VH} style={{ position: "absolute", left: 0, top: 0 }}>
        {[0, 1, 2].map((k) => {
          const cx = [1180, 220, 760][k] + Math.sin(f / 90 + k * 2) * 40;
          const cy = [260, 700, 860][k] + Math.cos(f / 110 + k) * 30;
          return Array.from({ length: 7 }, (_, i) => (
            <ellipse key={`${k}-${i}`} cx={cx} cy={cy} rx={90 + i * 74 + Math.sin(f / 60 + i + k) * 6} ry={52 + i * 48 + Math.cos(f / 70 + i) * 5} fill="none" stroke={C.blueLine} strokeWidth={2} opacity={0.5 - i * 0.05} transform={`rotate(${-18 + k * 14 + Math.sin(f / 150 + k) * 4} ${cx} ${cy})`} />
          ));
        })}
      </svg>
      {Array.from({ length: 16 }, (_, i) => {
        const x = random(`px${i}`) * VW;
        const y0 = random(`py${i}`) * VH;
        const y = (((y0 + f * (0.35 + random(`ps${i}`) * 0.45)) % VH) + VH) % VH;
        const sz = 5 + random(`pz${i}`) * 7;
        return <div key={i} style={{ position: "absolute", left: x + Math.sin(f / 45 + i) * 20, top: y, width: sz, height: sz, borderRadius: "50%", background: C.blueLine, opacity: 0.7 }} />;
      })}
    </AbsoluteFill>
  );
};

// ---------------- Screen content helpers ----------------
// Headline only (no kicker above it, per DESIGN.md): Poppins 600, words rise in.
export const Heading: React.FC<{ title: string }> = ({ title }) => {
  const f = useCurrentFrame();
  const words = title.split(" ");
  return (
    <div style={{ position: "absolute", left: 70, top: 50 }}>
      <div style={{ ...display(66), display: "flex", gap: 18 }}>
        {words.map((w, i) => {
          const p = tw(f, 4 + i * 3, 22 + i * 3, 0, 1);
          return (
            <span key={i} style={{ display: "inline-block", opacity: p, translate: `0px ${(1 - p) * 38}px`, filter: p < 0.98 ? `blur(${(1 - p) * 8}px)` : undefined }}>
              {w}
            </span>
          );
        })}
      </div>
      <div style={{ width: tw(f, 14, 40, 0, 150), height: 8, borderRadius: 4, background: C.blue, marginTop: 10 }} />
    </div>
  );
};

export const Pop: React.FC<{ delay: number; style?: React.CSSProperties; children: React.ReactNode; from?: "up" | "left" | "right" | "scale" }> = ({ delay, style, children, from = "up" }) => {
  const sp = useSpring(delay, 13, 140);
  const off = interpolate(sp, [0, 1], [70, 0]);
  const translate = from === "up" ? `0px ${off}px` : from === "left" ? `${-off}px 0px` : from === "right" ? `${off}px 0px` : "0px 0px";
  return (
    <div style={{ position: "absolute", opacity: Math.min(1, sp * 1.6), translate, scale: from === "scale" ? interpolate(sp, [0, 1], [0.55, 1]) : undefined, filter: sp < 0.95 ? `blur(${(1 - Math.min(1, sp)) * 7}px)` : undefined, ...style }}>
      {children}
    </div>
  );
};

// Deterministic burst of confetti / sparks around a point.
export const Burst: React.FC<{ start: number; x: number; y: number; colors?: string[]; count?: number; power?: number }> = ({ start, x, y, colors = [C.blueBright, C.lavender, C.sky, C.gain, C.gold], count = 22, power = 230 }) => {
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
        return <div key={i} style={{ position: "absolute", left: x + Math.cos(ang) * dist - sz / 2, top: y + Math.sin(ang) * dist + g - sz / 2, width: sz, height: i % 2 ? sz : sz * 0.5, borderRadius: i % 3 === 0 ? "50%" : 3, background: colors[i % colors.length], opacity: 1 - Math.max(0, t - 0.6) / 0.6, rotate: `${t * 420 * (i % 2 ? 1 : -1)}deg` }} />;
      })}
    </>
  );
};

// Small tag on the light world (blue wash) or solid status tag.
export const Tag: React.FC<{ children: React.ReactNode; bg?: string; color?: string; style?: React.CSSProperties }> = ({ children, bg = C.blueWash, color = C.blue, style }) => (
  <div style={{ ...body(26, color, 600), display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 18px", borderRadius: 12, background: bg, whiteSpace: "nowrap", ...style }}>{children}</div>
);

// Lucide line icon in a tile (DESIGN.md: one icon family, stroke 1.75, no emoji).
export const IconTile: React.FC<{ icon: LucideIcon; size?: number; bg?: string; color?: string }> = ({ icon: I, size = 72, bg = C.blueWash, color = C.blue }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.28, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    <I size={size * 0.54} strokeWidth={1.75} color={color} />
  </div>
);
