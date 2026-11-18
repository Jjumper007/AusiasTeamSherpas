import type { FrameRange } from '../timing'

/**
 * LOCKED. The camera of the base video: a close-up of the presenter, the wide office shot,
 * or the presentation screen filling the frame. Shots are planned from the scene durations,
 * so any script length gets the same rhythm.
 */
export type Shot = 'wide' | 'close' | 'screen'

export interface ShotCue {
  readonly atFrame: number
  readonly shot: Shot
}

/** Where the camera looks (office coordinates) and how far it zooms, per shot. */
export const SHOT_FRAMING: Readonly<Record<Shot, { readonly cx: number; readonly cy: number; readonly scale: number }>> = {
  wide: { cx: 960, cy: 540, scale: 1 },
  close: { cx: 560, cy: 440, scale: 1.75 },
  screen: { cx: 1215, cy: 530, scale: 1.22 },
}

/** After the chapter wipe, the wide shot holds this long before the camera moves to the screen. */
const SCREEN_AFTER_SEC = 0.8
/** While a scene plays, the camera cuts away from the screen this often… */
const CUTAWAY_EVERY_SEC = 8
/** …for this long, alternating a close-up and the wide shot. */
const CUTAWAY_SEC = 2.5
/** The hook opens on the presenter and pulls back to the office at this share of its length. */
const HOOK_WIDE_SHARE = 0.45
/** The video ends on the wide shot for this long. */
const ENDING_WIDE_SEC = 2.5

const hookShots = ({ from, durationInFrames }: FrameRange): ShotCue[] => [
  { atFrame: from, shot: 'close' },
  { atFrame: from + Math.round(durationInFrames * HOOK_WIDE_SHARE), shot: 'wide' },
]

const sceneShots = ({ from, durationInFrames }: FrameRange, fps: number, isLast: boolean): ShotCue[] => {
  const frames = (sec: number): number => Math.round(sec * fps)
  const end = from + durationInFrames
  const screenAt = from + frames(SCREEN_AFTER_SEC)
  // A cutaway must be back on the screen before the scene ends (or before the closing wide shot).
  const latestCutawayEnd = end - frames(isLast ? ENDING_WIDE_SEC : 0)
  const cutawayCount = Math.max(
    0,
    Math.floor((latestCutawayEnd - screenAt - frames(CUTAWAY_SEC)) / frames(CUTAWAY_EVERY_SEC)),
  )
  const cutaways = Array.from({ length: cutawayCount }, (_, index): ShotCue[] => {
    const start = screenAt + frames(CUTAWAY_EVERY_SEC) * (index + 1)
    return [
      { atFrame: start, shot: index % 2 === 0 ? 'close' : 'wide' },
      { atFrame: start + frames(CUTAWAY_SEC), shot: 'screen' },
    ]
  }).flat()
  const ending: ShotCue[] =
    isLast && end - frames(ENDING_WIDE_SEC) > screenAt
      ? [{ atFrame: end - frames(ENDING_WIDE_SEC), shot: 'wide' }]
      : []

  return [{ atFrame: from, shot: 'wide' }, { atFrame: screenAt, shot: 'screen' }, ...cutaways, ...ending]
}

/** Every camera cut of the video, in time order. The first scene is the hook. */
export const planShots = (ranges: readonly FrameRange[], fps: number): ShotCue[] =>
  ranges.flatMap((range, index) =>
    index === 0 ? hookShots(range) : sceneShots(range, fps, index === ranges.length - 1),
  )

/** Index of the cut in effect at `frame`. */
export const shotIndexAt = (cues: readonly ShotCue[], frame: number): number =>
  cues.reduce((found, cue, index) => (frame >= cue.atFrame ? index : found), 0)
