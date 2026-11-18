import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { C, clamp, AnimatedLogo, LogoBackdrop, s } from "./comun";

// Cierre: an iris closes over the last scene and the logo stays on screen until the very last frame (no fade-out).
export const CIERRE = s(4.5);
export const CIERRE_OVERLAP = 24;

export const SceneCierre: React.FC = () => {
  const f = useCurrentFrame();
  const R = interpolate(f, [0, CIERRE_OVERLAP], [-60, 1560], { ...clamp, easing: Easing.bezier(0.7, 0, 0.3, 1) });
  const done = f >= CIERRE_OVERLAP;
  const mask = done ? undefined : `radial-gradient(circle at 50% 50%, #000 ${R}px, transparent ${R + 60}px)`;
  const ring = Math.max(0, R);
  return (
    <AbsoluteFill style={{ WebkitMaskImage: mask, maskImage: mask }}>
      <LogoBackdrop />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", scale: interpolate(f, [0, CIERRE], [1.08, 1], clamp) }}>
        <AnimatedLogo width={820} start={CIERRE_OVERLAP - 2} sheen={CIERRE_OVERLAP + 30} id="lgCierre" />
      </AbsoluteFill>
      {!done ? <div style={{ position: "absolute", left: 960 - ring, top: 540 - ring, width: ring * 2, height: ring * 2, borderRadius: "50%", border: `5px solid ${C.yellow}`, opacity: 0.85, boxSizing: "border-box" }} /> : null}
    </AbsoluteFill>
  );
};
