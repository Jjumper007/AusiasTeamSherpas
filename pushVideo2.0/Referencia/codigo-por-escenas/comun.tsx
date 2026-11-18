import React from "react";
import { AbsoluteFill, Easing, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

// Shared timing, palette, animation helpers and screen components for every scene.
export const FPS = 30;
export const s = (sec: number) => Math.round(sec * FPS);
export const C = {
  ink: "#1F2340",
  muted: "#646A8A",
  card: "#FFFFFF",
  panel: "#F7F9FD",
  green: "#22A57E",
  greenSoft: "#D8F3EA",
  red: "#E5484D",
  redSoft: "#FDE1E1",
  blue: "#3B7DDD",
  blueSoft: "#DCE9FB",
  orange: "#F28C28",
  yellow: "#FFC23D",
  purple: "#6C4BD6",
  grey: "#D9DCE8",
};
export const FONT = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const ease = Easing.bezier(0.16, 1, 0.3, 1);
export const tw = (f: number, a: number, b: number, from: number, to: number, e = ease) =>
  interpolate(f, [a, b], [from, to], { ...clamp, easing: e });

export const useSpring = (delay = 0, damping = 14) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: f - delay, fps, config: { damping, stiffness: 150 } });
};
export const VW = 1500;
export const VH = 900;
// ---------------- Screen content helpers ----------------
export const Heading: React.FC<{ kicker: string; title: string }> = ({ kicker, title }) => {
  const sp = useSpring(2, 16);
  return (
    <div style={{ position: "absolute", left: 70, top: 46, opacity: Math.min(1, sp), translate: `${interpolate(sp, [0, 1], [-60, 0])}px 0px` }}>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 5, color: C.blue }}>{kicker}</div>
      <div style={{ fontSize: 62, fontWeight: 800, color: C.ink }}>{title}</div>
      <div style={{ width: interpolate(sp, [0, 1], [0, 120]), height: 6, borderRadius: 3, background: C.blue, marginTop: 8 }} />
    </div>
  );
};

export const Pop: React.FC<{ delay: number; style?: React.CSSProperties; children: React.ReactNode; from?: "up" | "left" | "right" | "scale" }> = ({ delay, style, children, from = "up" }) => {
  const sp = useSpring(delay);
  const off = interpolate(sp, [0, 1], [60, 0]);
  const translate = from === "up" ? `0px ${off}px` : from === "left" ? `${-off}px 0px` : from === "right" ? `${off}px 0px` : "0px 0px";
  return (
    <div style={{ position: "absolute", opacity: Math.min(1, sp * 1.4), translate, scale: from === "scale" ? interpolate(sp, [0, 1], [0.5, 1]) : undefined, ...style }}>
      {children}
    </div>
  );
};

export const cardStyle: React.CSSProperties = { background: C.card, borderRadius: 26, boxShadow: "0 12px 30px rgba(31,35,64,0.10)" };
