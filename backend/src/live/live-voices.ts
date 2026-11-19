import type { RunFolder } from '../pipeline/run-folder'
import type { RecordScene, VoicedScene } from '../voice/narrate'
import { formatSec, type LiveClock, type LiveLog } from './live-log'
import { SCENE_COUNT } from './scene-count'

/**
 * The Live run's voice (docs/specs/live-run.md, "Voice"): each narration is recorded as soon as it is
 * accepted or replaced, all at the same time, with the normal narrator's recorder (proxy, brand voice,
 * cache, captions). A voice has no fallback: one that fails fails the run.
 */


export interface VoiceBoardInput {
  readonly recordScene: RecordScene
  readonly folder: RunFolder
  readonly log: LiveLog
  readonly clock: LiveClock
  /** Called after each recording, with how many of the five are done. */
  readonly onRecorded: (count: number) => void
}

export interface VoiceBoard {
  /** Starts recording one scene; a scene already started, or anything after `stop`, is ignored. */
  readonly record: (index: number, narration: string) => void
  /** The five voices in script order, once all are recorded. Rejects with the first that fails. */
  readonly all: Promise<VoicedScene[]>
  /** No recording starts after this: the run failed or the page went away. */
  readonly stop: () => void
}

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error))

export const createVoiceBoard = ({ recordScene, folder, log, clock, onRecorded }: VoiceBoardInput): VoiceBoard => {
  let started: ReadonlySet<number> = new Set()
  let voiced: ReadonlyArray<VoicedScene | undefined> = Array(SCENE_COUNT).fill(undefined)
  let stopped = false
  let settle: { resolve: (voices: VoicedScene[]) => void; reject: (error: Error) => void } | undefined
  const all = new Promise<VoicedScene[]>((resolve, reject) => {
    settle = { resolve, reject }
  })
  // Nobody may be waiting any more (the page left): a later failure must not become an unhandled rejection.
  all.catch(() => undefined)

  const recorded = (index: number, voice: VoicedScene, startedAt: number): void => {
    voiced = voiced.map((old, at) => (at === index ? voice : old))
    const from = voice.fromCache ? 'from cache' : 'from the proxy'
    log(`voice: scene ${index + 1} recorded (${voice.audioSec.toFixed(2)} s, ${from}) in ${formatSec(clock.elapsedSec() - startedAt)} s`)
    const done = voiced.filter((scene): scene is VoicedScene => scene !== undefined)
    onRecorded(done.length)
    if (done.length === SCENE_COUNT) settle?.resolve(done)
  }

  const record = (index: number, narration: string): void => {
    if (stopped || started.has(index) || index < 0 || index >= SCENE_COUNT) return
    started = new Set([...started, index])
    const startedAt = clock.elapsedSec()
    const failed = (error: unknown): void => {
      log(`voice: scene ${index + 1} failed: ${errorMessage(error)}`)
      settle?.reject(new Error(`scene ${index + 1}: ${errorMessage(error)}`, { cause: error }))
    }
    // Through a promise, so a recorder that throws at once fails the run like one that rejects.
    Promise.resolve()
      .then(() => recordScene(narration, index, folder))
      .then((voice) => recorded(index, voice, startedAt), failed)
      .catch(failed)
  }

  return {
    record,
    all,
    stop: () => {
      stopped = true
    },
  }
}
