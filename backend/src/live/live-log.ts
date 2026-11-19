import type { RunFolder } from '../pipeline/run-folder'

/**
 * The Live run's log lines carry the seconds since the job started, so a run folder shows where the
 * time went: `[live +7.3s] script: scene 2 (where_you_are) closed, accepted`.
 */

const MS_PER_SECOND = 1000
const DECIMALS = 1

export interface LiveClock {
  /** Seconds since the clock started. */
  readonly elapsedSec: () => number
}

/** Writes one line to the run's log.txt with the elapsed time in front. */
export type LiveLog = (line: string) => void

export const startClock = (now: () => Date): LiveClock => {
  const startedAt = now().getTime()
  return { elapsedSec: () => (now().getTime() - startedAt) / MS_PER_SECOND }
}

/** "7.3": seconds as the log writes them. */
export const formatSec = (seconds: number): string => seconds.toFixed(DECIMALS)

export const liveLog =
  (folder: Pick<RunFolder, 'log'>, clock: LiveClock): LiveLog =>
  (line) =>
    folder.log(`[live +${formatSec(clock.elapsedSec())}s] ${line}`)
