import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { C, clamp, AnimatedLogo, LogoBackdrop, s } from "./comun";

// Apertura: only the logo. The last frames are the transition (iris) that opens onto the first scene.
export const APERTURA = s(3);
export const APERTURA_IRIS_START = 58;

export const SceneApertura: React.FC = () => {
  const f = useCurrentFrame();
  const iris = f >= APERTURA_IRIS_START;
  const R = interpolate(f, [APERTURA_IRIS_START, APERTURA], [-60, 1560], { ...clamp, easing: Easing.bezier(0.7, 0, 0.3, 1) });
  const push = interpolate(f, [0, APERTURA], [1, 1.1], clamp);
  const out = interpolate(f, [APERTURA_IRIS_START, APERTURA_IRIS_START + 14], [1, 0], clamp);
  const mask = iris ? `radial-gradient(circle at 50% 50%, transparent ${R}px, #000 ${R + 60}px)` : undefined;
  const ring = Math.max(0, R + 30);
  return (
    <AbsoluteFill style={{ WebkitMaskImage: mask, maskImage: mask }}>
      <LogoBackdrop />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", scale: push, opacity: out }}>
        <AnimatedLogo width={820} start={12} sheen={36} id="lgApertura" />
      </AbsoluteFill>
      {iris ? <div style={{ position: "absolute", left: 960 - ring, top: 540 - ring, width: ring * 2, height: ring * 2, borderRadius: "50%", border: `5px solid ${C.yellow}`, opacity: interpolate(f, [APERTURA_IRIS_START, APERTURA], [0.9, 0], clamp), boxSizing: "border-box" }} /> : null}
    </AbsoluteFill>
  );
};
