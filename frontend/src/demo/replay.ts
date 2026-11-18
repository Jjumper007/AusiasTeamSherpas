// The run replay: the demo's short wait walks through the steps of the real run that made the
// video, with how long each one took, and then says it is a demo. It never shows the run's total.
import type { ReplayStep } from '../types'

/** How long the replay lasts; the yak's exit and the fade add up to 2.5 s, so the wait stays within 8–10 s. */
export const REPLAY_MS = 7000
export const DEMO_NOTE = 'This is a demo: these are the steps of the real run that made this video.'

const SECONDS_PER_MINUTE = 60

export interface ReplayTick {
  /** When it shows, from the start of the replay. */
  readonly atMs: number
  /** 0–1: the share of the real run the steps before this one took. */
  readonly progress: number
  readonly label: string
}

/** "under 1 s", "28 s", "1 min", "2 min 10 s". */
export const formatDuration = (seconds: number): string => {
  if (seconds < 1) return 'under 1 s'
  if (seconds < SECONDS_PER_MINUTE) return `${seconds} s`
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE)
  const rest = seconds % SECONDS_PER_MINUTE
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`
}

/** One tick per step, evenly spread over `totalMs`, and a last one that says it is a demo. */
export const replayTicks = (steps: readonly ReplayStep[], totalMs = REPLAY_MS): ReplayTick[] => {
  const slice = totalMs / (steps.length + 1)
  const runSeconds = steps.reduce((sum, step) => sum + step.seconds, 0)
  const doneBefore = (index: number): number => steps.slice(0, index).reduce((sum, step) => sum + step.seconds, 0)
  const stepTicks = steps.map((step, index) => ({
    atMs: Math.round(index * slice),
    progress: runSeconds > 0 ? doneBefore(index) / runSeconds : 0,
    label: `${step.label} · ${formatDuration(step.seconds)}`,
  }))
  return [...stepTicks, { atMs: Math.round(steps.length * slice), progress: 1, label: DEMO_NOTE }]
}
