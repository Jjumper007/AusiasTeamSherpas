import { MAX_HOOK_SEC, MIN_VIDEO_SEC } from '../script/scene-timing'

/**
 * Scene lengths from the narration audio: each scene lasts as long as its voice plus a short pause.
 * The hook keeps within `MAX_HOOK_SEC` by giving up its pause, and a short video is padded after
 * the hook so it reaches `MIN_VIDEO_SEC` (SPEC §4). The voice itself is never cut.
 */

/** Silence after each scene's narration, before the next scene starts. */
export const VOICE_PAUSE_SEC = 0.5
/** Longest video the validator accepts (SPEC §5.5). */
export const MAX_VIDEO_SEC = 120

const TENTHS = 10
/** Rounds up, so a scene never ends before its audio. */
const ceilToTenth = (seconds: number): number => Math.ceil(seconds * TENTHS - 1e-9) / TENTHS

const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0)

/** The hook's audio plus as much pause as fits in `MAX_HOOK_SEC`; never shorter than its audio. */
const hookDuration = (audioSec: number): number =>
  ceilToTenth(Math.max(audioSec, Math.min(MAX_HOOK_SEC, audioSec + VOICE_PAUSE_SEC)))

/** Spreads the seconds missing to `MIN_VIDEO_SEC` evenly over the scenes after the hook, as longer pauses. */
const padToMinimum = (hook: number, rest: readonly number[]): number[] => {
  const missing = MIN_VIDEO_SEC - hook - sum(rest)
  if (missing <= 0 || rest.length === 0) return [...rest]
  return rest.map((seconds) => ceilToTenth(seconds + missing / rest.length))
}

/** One duration per scene, in script order, from the length of each scene's audio. */
export const sceneDurations = (audioSec: readonly number[]): number[] => {
  const [hookAudio, ...restAudio] = audioSec
  if (hookAudio === undefined) return []
  const hook = hookDuration(hookAudio)
  return [hook, ...padToMinimum(hook, restAudio.map((seconds) => ceilToTenth(seconds + VOICE_PAUSE_SEC)))]
}

/** What the voice made break the rules of SPEC §4, for the run log: the script is what must change. */
export const durationWarnings = (durations: readonly number[]): string[] => {
  const total = sum(durations)
  return [
    ...(durations[0] > MAX_HOOK_SEC ? [`the hook narration lasts ${durations[0]} s, over ${MAX_HOOK_SEC} s`] : []),
    ...(total > MAX_VIDEO_SEC ? [`the video lasts ${total.toFixed(1)} s, over ${MAX_VIDEO_SEC} s`] : []),
  ]
}
