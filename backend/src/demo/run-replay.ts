import { z } from 'zod'
import { STEP_IDS, type ReplayStep, type ReplayStepId } from '../api/types'
import { REVIEW_LABEL, STEP_LABEL } from '../pipeline/run-job'

/**
 * The steps of the run that made a demo video, read from its log.txt, for the short wait the demo
 * plays before the video (the run replay). Each step ends at its last line in the log; how long it
 * took is the time since the step before it ended (the first one: since the log's first line).
 */

/** In the order the pipeline runs them; the visual review sits inside the scenes step but shows on its own. */
const REPLAY_ORDER: readonly ReplayStepId[] = ['brief', 'script', 'voice', 'scenes', 'review', 'render']
const LABEL: Readonly<Record<ReplayStepId, string>> = { ...STEP_LABEL, review: REVIEW_LABEL }
/** "2026-11-18T21:21:40.870Z [script] …" */
const LOG_ENTRY = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z) \[([a-z]+)\]/
/** The line the pipeline writes once the MP4 exists. */
const VIDEO_WRITTEN = /^\S+ \[render\] video\.mp4 written/m
const MS_PER_SECOND = 1000

interface Entry {
  readonly at: number
  readonly tag: string
}

const entriesOf = (log: string): Entry[] =>
  log.split('\n').flatMap((line) => {
    const match = LOG_ENTRY.exec(line)
    return match ? [{ at: Date.parse(match[1]), tag: match[2] }] : []
  })

/** The run's steps with their real durations, or null when the log does not show the video being written. */
export const replaySteps = (log: string): ReplayStep[] | null => {
  const entries = entriesOf(log)
  const first = entries[0]
  if (!first || !VIDEO_WRITTEN.test(log)) return null
  const ends = REPLAY_ORDER.flatMap((step) => {
    const last = entries.filter((entry) => entry.tag === step).at(-1)
    return last ? [{ step, at: last.at }] : []
  })
  return ends.map(({ step, at }, index) => ({
    step,
    label: LABEL[step],
    seconds: Math.max(0, Math.round((at - (ends[index - 1]?.at ?? first.at)) / MS_PER_SECOND)),
  }))
}

/** replay.json read back from the demo folder: untrusted, checked before it reaches the site. */
export const ReplaySchema = z
  .array(
    z.object({
      step: z.enum([...STEP_IDS, 'review']),
      label: z.string().min(1),
      seconds: z.number().int().nonnegative(),
    }),
  )
  .min(1) satisfies z.ZodType<ReplayStep[]>
