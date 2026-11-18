import React from "react";
import { Sequence, staticFile } from "remotion";
import { Audio } from "@remotion/media";
import { s } from "../codigo-por-escenas/comun";

// Sound effects (no voice yet: it will be added later). Files live in public/sfx (from remotion.media).
type Sfx = "whoosh" | "whip" | "page-turn" | "switch" | "mouse-click" | "ding" | "shutter-modern";
export type Event = { at: number; sfx: Sfx; vol?: number }; // `at` in seconds of the scene/section it belongs to

const Track: React.FC<{ events: Event[] }> = ({ events }) => (
  <>
    {events.map((e, i) => (
      <Sequence key={i} from={Math.max(0, s(e.at))} durationInFrames={s(3)} layout="none" name={`sfx ${e.sfx}`}>
        <Audio src={staticFile(`sfx/${e.sfx}.wav`)} volume={e.vol ?? 0.5} />
      </Sequence>
    ))}
  </>
);

const SCENES = [0, 6, 12, 22, 33, 44, 56, 66, 75, 84, 96];
const CONTENT: Event[] = [
  { at: 0.1, sfx: "whoosh", vol: 0.4 }, // the presenter walks in
  { at: 0.4, sfx: "switch", vol: 0.4 }, // the screen turns on
  { at: 3.6, sfx: "switch", vol: 0.35 }, // "will it last?"
  // chapter wipes
  ...SCENES.slice(1, -1).map((t) => ({ at: t - 0.45, sfx: "whoosh" as Sfx, vol: 0.5 })),
  // "how we help" chips
  ...[29.4, 40.4, 51.6, 62.6, 70].map((t) => ({ at: t, sfx: "page-turn" as Sfx, vol: 0.3 })),
  // callouts: good news ding, risks whip
  { at: 19.2, sfx: "ding", vol: 0.45 },
  { at: 41, sfx: "whip", vol: 0.35 },
  { at: 52, sfx: "whip", vol: 0.4 },
  { at: 60.2, sfx: "whip", vol: 0.35 },
  { at: 67, sfx: "ding", vol: 0.45 },
  // scene details
  { at: 14.8, sfx: "mouse-click", vol: 0.25 },
  { at: 16.2, sfx: "mouse-click", vol: 0.25 },
  { at: 18.3, sfx: "mouse-click", vol: 0.25 },
  { at: 36, sfx: "shutter-modern", vol: 0.25 }, // the cash tank starts to fill
  { at: 78.3, sfx: "ding", vol: 0.3 }, // camps reached
  { at: 79.2, sfx: "ding", vol: 0.3 },
  { at: 80.1, sfx: "ding", vol: 0.3 },
  { at: 87.6, sfx: "whoosh", vol: 0.3 },
  { at: 90.2, sfx: "ding", vol: 0.4 }, // the flag reaches the summit
  // extra detail sounds
  { at: 5.6, sfx: "ding", vol: 0.3 }, // flag planted at the summit
  ...[0, 1, 2, 3, 4, 5].map((i) => ({ at: 6.4 + i * 0.22, sfx: "mouse-click" as Sfx, vol: 0.2 })), // cards drop in
  ...[0, 1, 2, 3, 4].map((i) => ({ at: 24 + i * 0.8, sfx: "mouse-click" as Sfx, vol: 0.35 })), // crates land on the pack
  { at: 28.8, sfx: "whip", vol: 0.4 }, // over the limit
  { at: 33.8, sfx: "page-turn", vol: 0.3 }, // January 2027 card flips in
  { at: 57.2, sfx: "page-turn", vol: 0.3 }, // life insurance row
  { at: 59.4, sfx: "page-turn", vol: 0.3 }, // umbrella row
  { at: 62.5, sfx: "mouse-click", vol: 0.4 }, // card at 20%
  { at: 69.2, sfx: "page-turn", vol: 0.3 }, // donuts
  { at: 70, sfx: "page-turn", vol: 0.3 },
];
// Camera cuts: a short whip on every shot change.
export const SfxContent: React.FC<{ cuts: number[] }> = ({ cuts }) => (
  <>
    <Track events={CONTENT} />
    <Track events={cuts.map((t) => ({ at: t - 0.05, sfx: "whip" as Sfx, vol: 0.35 }))} />
  </>
);

export const SfxApertura: React.FC = () => (
  <Track
    events={[
      { at: 0.2, sfx: "whoosh", vol: 0.6 },
      { at: 1.75, sfx: "ding", vol: 0.5 },
      { at: 58 / 30, sfx: "whip", vol: 0.5 },
    ]}
  />
);

export const SfxCierre: React.FC = () => (
  <Track
    events={[
      { at: 58 / 30, sfx: "ding", vol: 0.5 }, // logo reveal only: no sound on the transition
    ]}
  />
);
