import type { Brief, Facts, Scene, Script } from '@sherpas/shared'
import type { LiveSceneEvent } from '../api/live-types'
import type { RunFolder } from '../pipeline/run-folder'
import type { RecordScene } from '../voice/narrate'
import { VOICE_PAUSE_SEC } from '../voice/scene-durations'
import type { LiveClock, LiveLog } from './live-log'
import { LIVE_SCENE_PARTS } from './live-scene-files'
import { designLiveScene, type SceneStepDeps, type SceneStepResult } from './live-scene-step'
import { savedSceneModulePath } from './scene-module-contract'

/**
 * Claude's scenes in a Live run (#15): each of parts 3–5 is designed as soon as its narration is
 * resolved and its voice recorded (so its length is known, ~1 s before `live-ready`), all three in
 * parallel and each on its own. Every part ends in one `scene` event, `ready` or `standard`; `all`
 * says when the three are resolved, which is when the run may start its MP4 (#17) or send `end`.
 */

export interface LiveScenesInput {
  readonly step: SceneStepDeps
  readonly brief: Brief
  readonly facts: Facts
  readonly folder: Pick<RunFolder, 'runId' | 'path' | 'writeText'>
  readonly log: LiveLog
  readonly clock: LiveClock
  readonly emit: (event: LiveSceneEvent) => void
}

export interface LiveScenes {
  /** The script resolved scene `index`; `current` is read when the part starts, for its chapter and CTA. */
  readonly scriptScene: (index: number, scene: Scene, current: () => Script) => void
  /** The recorder the voices use, so each recorded voice can start its part. */
  readonly recordingWith: (record: RecordScene) => RecordScene
  /** The three results, in the order they resolved. Never rejects. */
  readonly all: Promise<SceneStepResult[]>
  /** No part starts after this: the run failed. */
  readonly stop: () => void
}

interface Resolved {
  readonly scene: Scene
  readonly current: () => Script
}

const eventOf = (result: SceneStepResult, runId: string): LiveSceneEvent =>
  result.status === 'ready'
    ? { type: 'scene', part: result.part, status: 'ready', moduleUrl: savedSceneModulePath(runId, result.part) }
    : { type: 'scene', part: result.part, status: 'standard', reason: result.reason }

export const createLiveScenes = (input: LiveScenesInput): LiveScenes => {
  let scripted: ReadonlyMap<number, Resolved> = new Map()
  let voiced: ReadonlyMap<number, number> = new Map()
  let started: ReadonlySet<number> = new Set()
  let results: readonly SceneStepResult[] = []
  let stopped = false
  let finish: (results: SceneStepResult[]) => void = () => undefined
  const all = new Promise<SceneStepResult[]>((resolve) => {
    finish = resolve
  })

  const resolved = (result: SceneStepResult): void => {
    results = [...results, result]
    input.emit(eventOf(result, input.folder.runId))
    if (results.length === LIVE_SCENE_PARTS.length) finish([...results])
  }

  /** Starts the part of scene `index` once its scene and its voice are both known. */
  const maybeStart = (index: number): void => {
    const resolvedScene = scripted.get(index)
    const audioSec = voiced.get(index)
    if (stopped || started.has(index) || !resolvedScene || audioSec === undefined) return
    const { scene, current } = resolvedScene
    if (!LIVE_SCENE_PARTS.includes(scene.part)) return
    started = new Set([...started, index])
    const script = current()
    const request = {
      part: scene.part,
      brief: input.brief,
      facts: input.facts,
      scene,
      chapter: script.chapters[index],
      cta: script.cta,
      durationSec: audioSec + VOICE_PAUSE_SEC,
    }
    // After the current callbacks: the prompt and the template copy (a few ms of file work) must not
    // hold back the voice that is being handed over, and with it `live-ready`.
    setTimeout(() => {
      designLiveScene(request, input.step, input)
        .then(resolved)
        .catch((error: unknown) => input.log(`scene ${scene.part}: could not report the result: ${String(error)}`))
    }, 0)
  }

  return {
    scriptScene: (index, scene, current) => {
      scripted = new Map([...scripted, [index, { scene, current }]])
      maybeStart(index)
    },
    recordingWith: (record) => async (narration, index, folder) => {
      const voice = await record(narration, index, folder)
      voiced = new Map([...voiced, [index, voice.audioSec]])
      maybeStart(index)
      return voice
    },
    all,
    stop: () => {
      stopped = true
    },
  }
}
