import type { Part } from '@sherpas/shared'
import type { LiveSceneOutcome, LiveSceneReport } from '../api/live-types'
import { LIVE_SCENE_PARTS } from './live-scene-files'
import { LOAD_FAILED_TEXT, THREW_TEXT } from './scene-report-routes'

/**
 * What the page did with each Claude scene, as far as the background MP4 (#17) cares. A scene the page
 * could not load, or that threw while drawing, is left out of the MP4: a broken scene never reaches a
 * kept video. A scene that arrived too late to be swapped in (`late`, `started`) still goes in: the run
 * accepted it and it passed every check; the page only had no time to show it.
 */

/** The page's outcomes that keep an accepted scene out of the MP4. */
export const REFUSED_OUTCOMES: ReadonlySet<LiveSceneOutcome> = new Set<LiveSceneOutcome>(['load-failed', 'threw'])

export interface BrowserVerdicts {
  /** The parts the page refused so far, and how. */
  readonly refused: () => ReadonlyMap<Part, LiveSceneOutcome>
  /** Calls `listener` with each part refused from now on. Returns the function that stops listening. */
  readonly onRefused: (listener: (part: Part) => void) => () => void
}

export interface BrowserVerdictsRecorder extends BrowserVerdicts {
  /** One report of the page (`POST /api/live/jobs/:id/scene`); only refusals count, each part once. */
  readonly record: (report: Pick<LiveSceneReport, 'part' | 'outcome'>) => void
}

type Listener = (part: Part) => void

export const createBrowserVerdicts = (): BrowserVerdictsRecorder => {
  let refused: ReadonlyMap<Part, LiveSceneOutcome> = new Map()
  let listeners: readonly Listener[] = []
  return {
    refused: () => refused,
    onRefused: (listener) => {
      listeners = [...listeners, listener]
      return () => {
        listeners = listeners.filter((each) => each !== listener)
      }
    },
    record: ({ part, outcome }) => {
      if (!REFUSED_OUTCOMES.has(outcome) || refused.has(part)) return
      refused = new Map([...refused, [part, outcome]])
      listeners.forEach((listener) => listener(part))
    },
  }
}

/** A report line of the live log: "<ISO> [live +22.2s] scene first_step: <what the page did>". */
const REPORT_LINE = /^\S+ \[live \+\d+(?:\.\d+)?s\] scene (\w+): (.*)$/
const REFUSAL_TEXTS: ReadonlyArray<readonly [LiveSceneOutcome, string]> = [
  ['load-failed', LOAD_FAILED_TEXT],
  ['threw', THREW_TEXT],
]

const isLiveScenePart = (value: string): value is Part => (LIVE_SCENE_PARTS as readonly string[]).includes(value)

/** The refusals a run's log.txt recorded: for an MP4 made after the run, from the command line. */
export const verdictsFromLog = (log: string): BrowserVerdicts => {
  const verdicts = createBrowserVerdicts()
  log.split('\n').forEach((line) => {
    const match = REPORT_LINE.exec(line)
    if (!match || !isLiveScenePart(match[1])) return
    const part = match[1]
    REFUSAL_TEXTS.filter(([, text]) => match[2].startsWith(text)).forEach(([outcome]) => verdicts.record({ part, outcome }))
  })
  return verdicts
}
