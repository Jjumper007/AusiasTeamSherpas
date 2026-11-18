import type { ShotCue } from './stage/camera'
import { BRAND, type FrameRange } from './timing'

/**
 * LOCKED. The soundtrack of the base video (Video 4.0), worked out from the video's own timeline
 * so it fits any script: a whoosh as the presenter walks in and at every chapter wipe, a click as
 * the screen switches on, a whip on every camera cut, a ding or a whip on each callout, and the
 * logo's sounds in the opening and closing. Pure, so it is unit-tested; `Soundtrack.tsx` plays it.
 */

export type Sfx = 'whoosh' | 'whip' | 'switch' | 'ding'

export interface SfxCue {
  /** Frame of the whole video (opening included). */
  readonly atFrame: number
  readonly sfx: Sfx
  readonly volume: number
}

export interface SoundTimeline {
  readonly fps: number
  /** Scene ranges, in frames from the start of the scenes. */
  readonly ranges: readonly FrameRange[]
  /** Camera cues, in frames from the start of the scenes. */
  readonly shots: readonly ShotCue[]
  /** Callouts: when they pop (from the start of the scenes) and whether they are good news. */
  readonly callouts: ReadonlyArray<{ readonly startFrame: number; readonly good: boolean }>
  /** Where the closing starts, in frames of the whole video. */
  readonly outroFromFrame: number
}

const sec = (seconds: number, fps: number): number => Math.round(seconds * fps)

/** Sound cues of the opening, in its own frames (Video 4.0's timing). */
const OPENING: ReadonlyArray<{ readonly atSec: number; readonly sfx: Sfx; readonly volume: number }> = [
  { atSec: 0.2, sfx: 'whoosh', volume: 0.6 },
  { atSec: 1.75, sfx: 'ding', volume: 0.5 },
]
/** The closing logo lands with a ding this long after the closing starts. */
const CLOSING_DING_FRAMES = 58
/** Wipes and cuts sound a little before they happen, as the motion starts. */
const WIPE_LEAD_SEC = 0.45
const CUT_LEAD_SEC = 0.05

/** Every sound effect of the video, in order. */
export const soundCues = ({ fps, ranges, shots, callouts, outroFromFrame }: SoundTimeline): SfxCue[] => {
  const content = (frame: number): number => BRAND.contentFromFrame + frame
  const opening: SfxCue[] = [
    ...OPENING.map(({ atSec, sfx, volume }) => ({ atFrame: sec(atSec, fps), sfx, volume })),
    { atFrame: BRAND.irisOpenFrame, sfx: 'whip', volume: 0.5 },
  ]
  const stage: SfxCue[] = [
    { atFrame: content(sec(0.1, fps)), sfx: 'whoosh', volume: 0.4 },
    { atFrame: content(sec(0.4, fps)), sfx: 'switch', volume: 0.4 },
  ]
  const wipes: SfxCue[] = ranges
    .slice(1)
    .map((range) => ({ atFrame: content(range.from - sec(WIPE_LEAD_SEC, fps)), sfx: 'whoosh', volume: 0.5 }))
  const cuts: SfxCue[] = shots
    .filter((cue, index) => index > 0 && cue.shot !== shots[index - 1].shot)
    .map((cue) => ({ atFrame: content(cue.atFrame - sec(CUT_LEAD_SEC, fps)), sfx: 'whip', volume: 0.35 }))
  const calls: SfxCue[] = callouts.map(({ startFrame, good }) =>
    good
      ? { atFrame: content(startFrame), sfx: 'ding', volume: 0.45 }
      : { atFrame: content(startFrame), sfx: 'whip', volume: 0.4 },
  )
  const closing: SfxCue = { atFrame: outroFromFrame + CLOSING_DING_FRAMES, sfx: 'ding', volume: 0.5 }
  return [...opening, ...stage, ...wipes, ...cuts, ...calls, closing].sort((a, b) => a.atFrame - b.atFrame)
}

/** The music's level on its own (opening and closing) and under the narration. */
export const MUSIC_LEVEL = { full: 0.3, underVoice: 0.12 } as const
const MUSIC_FADE_IN_FRAMES = 60
const MUSIC_FADE_OUT_FRAMES = 90
/** How long the music takes to dip under the voice and to come back up. */
const DUCK_FRAMES = 20

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value))

/**
 * Volume of the music at `frame`: it fades in under the logo, dips under the narration while the
 * scenes play (Video 4.0 had no voice yet), comes back for the closing and fades out at the end.
 */
export const musicVolume = (frame: number, totalFrames: number, outroFromFrame: number): number => {
  const fadeIn = clamp01(frame / MUSIC_FADE_IN_FRAMES)
  const fadeOut = clamp01((totalFrames - frame) / MUSIC_FADE_OUT_FRAMES)
  const duck = Math.min(
    clamp01((frame - BRAND.contentFromFrame) / DUCK_FRAMES),
    clamp01((outroFromFrame - frame) / DUCK_FRAMES),
  )
  const level = MUSIC_LEVEL.full - (MUSIC_LEVEL.full - MUSIC_LEVEL.underVoice) * duck
  return level * fadeIn * fadeOut
}
