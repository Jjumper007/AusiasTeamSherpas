/// <reference types="node" />
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { Part } from '@sherpas/shared'
import { sceneFileOf } from './scene-module-contract'

/**
 * Where a Live run keeps Claude's work on each of parts 3–5 (#15), in its run folder:
 * - `scene-<part>-prompt.md` and `scene-<part>-answer.txt`: what was asked and what came back;
 * - `scene-<part>.tsx` and `scene-<part>.js`: only for an accepted scene, its source and the module
 *   compiled once for the browser (served by `scene-module-routes.ts`);
 * - `live-scenes/<part>/`: the part's own copy of the template, where its checks ran.
 */

/** The parts Claude designs while the video plays: 1 and 2 play before any design could be ready. */
export const LIVE_SCENE_PARTS: readonly Part[] = ['what_matters', 'first_step', 'what_changes']

const SANDBOXES_DIR = 'live-scenes'

export interface LiveSceneFiles {
  readonly prompt: string
  readonly answer: string
  /** The accepted source, as it goes into a template copy at `src/<sceneFile>`. */
  readonly source: string
  readonly module: string
  /** The part's copy of the template, relative to the run folder. */
  readonly sandbox: string
  /** The scene file inside a template copy: "src/scenes/WhatMattersScene.tsx". */
  readonly sceneFile: string
}

export const liveSceneFiles = (part: Part): LiveSceneFiles => ({
  prompt: `scene-${part}-prompt.md`,
  answer: `scene-${part}-answer.txt`,
  source: `scene-${part}.tsx`,
  module: `scene-${part}.js`,
  sandbox: `${SANDBOXES_DIR}/${part}`,
  sceneFile: `src/${sceneFileOf(part)}`,
})

export interface AcceptedLiveScene {
  readonly part: Part
  /** Absolute path of the accepted source. */
  readonly sourcePath: string
  /** Where it goes in a template copy: "src/scenes/WhatMattersScene.tsx". */
  readonly sceneFile: string
}

/**
 * The parts whose Claude scene a run accepted, with their sources: what the background MP4 (#17) puts
 * into its template copy. A part without an accepted source plays its Standard scene.
 */
export const acceptedLiveScenes = (runDir: string): AcceptedLiveScene[] =>
  LIVE_SCENE_PARTS.flatMap((part) => {
    const files = liveSceneFiles(part)
    const sourcePath = join(runDir, files.source)
    return existsSync(sourcePath) ? [{ part, sourcePath, sceneFile: files.sceneFile }] : []
  })
