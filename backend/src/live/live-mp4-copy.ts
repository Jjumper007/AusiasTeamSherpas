/// <reference types="node" />
import { copyFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Part, VideoProps } from '@sherpas/shared'
import type { LiveSceneOutcome } from '../api/live-types'
import { createSandbox } from '../scenes/sandbox'
import { LIVE_SCENE_PARTS, type AcceptedLiveScene } from './live-scene-files'

/**
 * The final copy of the template that the background MP4 renders (#17): the template's sources, with
 * the source of each Claude scene that goes into the MP4 at its scene file, and nothing else changed.
 * Parts 1–2, and any part without a scene in the MP4, keep the template's Standard scene. It is the
 * run's `video-template/`, as in a normal run, so `demo:check` runs the number guard over what rendered.
 */

export interface RefusedScene {
  readonly part: Part
  readonly outcome: LiveSceneOutcome
}

export interface Mp4Scenes {
  /** The accepted scenes that go into the MP4. */
  readonly included: readonly AcceptedLiveScene[]
  /** Accepted scenes left out because the page refused them. */
  readonly refused: readonly RefusedScene[]
}

/** The accepted scenes, without the ones the page refused. */
export const scenesForMp4 = (accepted: readonly AcceptedLiveScene[], refused: ReadonlyMap<Part, LiveSceneOutcome>): Mp4Scenes => ({
  included: accepted.filter((scene) => !refused.has(scene.part)),
  refused: accepted.flatMap((scene) => {
    const outcome = refused.get(scene.part)
    return outcome ? [{ part: scene.part, outcome }] : []
  }),
})

const REFUSAL_REASON: Readonly<Partial<Record<LiveSceneOutcome, string>>> = {
  'load-failed': 'the page could not load it',
  threw: 'it threw while drawing in the page',
}

/** "what_matters Claude's, first_step Standard (it threw while drawing in the page), what_changes Standard (no Claude scene accepted)". */
export const describeMp4Scenes = (scenes: Mp4Scenes): string =>
  LIVE_SCENE_PARTS.map((part) => {
    if (scenes.included.some((scene) => scene.part === part)) return `${part} Claude's`
    const refusal = scenes.refused.find((scene) => scene.part === part)
    const why = refusal ? (REFUSAL_REASON[refusal.outcome] ?? refusal.outcome) : 'no Claude scene accepted'
    return `${part} Standard (${why})`
  }).join(', ')

/** Writes the final copy at `copyDir`, replacing any earlier one: the template, the props and `included`'s sources. */
export const assembleFinalCopy = (templateDir: string, copyDir: string, props: VideoProps, included: readonly AcceptedLiveScene[]): void => {
  createSandbox(templateDir, copyDir, props)
  included.forEach((scene) => copyFileSync(scene.sourcePath, join(copyDir, scene.sceneFile)))
}
