/// <reference types="node" />
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Part, VideoProps } from '@sherpas/shared'
import { afterEach, describe, expect, it } from 'vitest'
import { VIDEO_TEMPLATE_DIR } from '../paths'
import { listFiles, PROPS_FILE } from '../scenes/sandbox'
import { removeTempDirs, tempRunsDir } from './live-fakes.test-helper'
import { assembleFinalCopy, describeMp4Scenes, scenesForMp4 } from './live-mp4-copy'
import type { AcceptedLiveScene } from './live-scene-files'
import { sceneFileOf } from './scene-module-contract'

afterEach(removeTempDirs)

/** Only what the copy writes: the assembly does not read the props. */
const props = { marker: 'props of this run' } as unknown as VideoProps

/** An accepted scene whose source is the template's own scene plus a marker, in `dir`. */
const acceptedScene = (dir: string, part: Part): AcceptedLiveScene => {
  const sourcePath = join(dir, `scene-${part}.tsx`)
  writeFileSync(sourcePath, `${readFileSync(join(VIDEO_TEMPLATE_DIR, 'src', sceneFileOf(part)), 'utf8')}// by Claude\n`)
  return { part, sourcePath, sceneFile: `src/${sceneFileOf(part)}` }
}

const differingSources = (copyDir: string): string[] =>
  listFiles(join(copyDir, 'src')).filter(
    (key) => readFileSync(join(copyDir, 'src', key), 'utf8') !== readFileSync(join(VIDEO_TEMPLATE_DIR, 'src', key), 'utf8'),
  )

describe('assembleFinalCopy', () => {
  it("writes the template's sources with only the given scenes changed, and the run's props", () => {
    // Arrange
    const runDir = tempRunsDir()
    const copyDir = join(runDir, 'video-template')
    const scene = acceptedScene(runDir, 'first_step')

    // Act
    assembleFinalCopy(VIDEO_TEMPLATE_DIR, copyDir, props, [scene])

    // Assert
    expect(differingSources(copyDir)).toEqual([sceneFileOf('first_step')])
    expect(readFileSync(join(copyDir, scene.sceneFile), 'utf8')).toBe(readFileSync(scene.sourcePath, 'utf8'))
    expect(JSON.parse(readFileSync(join(copyDir, PROPS_FILE), 'utf8'))).toEqual(props)
    expect(listFiles(join(copyDir, 'src')).filter((key) => key.endsWith('.test.ts'))).toEqual([])
  })

  it('replaces an earlier copy, so a scene left out on a second assembly is the Standard one again', () => {
    // Arrange
    const runDir = tempRunsDir()
    const copyDir = join(runDir, 'video-template')
    const matters = acceptedScene(runDir, 'what_matters')
    const changes = acceptedScene(runDir, 'what_changes')
    assembleFinalCopy(VIDEO_TEMPLATE_DIR, copyDir, props, [matters, changes])

    // Act
    assembleFinalCopy(VIDEO_TEMPLATE_DIR, copyDir, props, [changes])

    // Assert
    expect(differingSources(copyDir)).toEqual([sceneFileOf('what_changes')])
  })
})

describe('scenesForMp4 and describeMp4Scenes', () => {
  it('keeps the accepted scenes the page did not refuse, and says why each part is what it is', () => {
    // Arrange
    const runDir = tempRunsDir()
    const accepted = [acceptedScene(runDir, 'what_matters'), acceptedScene(runDir, 'first_step')]

    // Act
    const scenes = scenesForMp4(accepted, new Map([['first_step', 'threw']]))

    // Assert
    expect(scenes.included.map((scene) => scene.part)).toEqual(['what_matters'])
    expect(scenes.refused).toEqual([{ part: 'first_step', outcome: 'threw' }])
    expect(describeMp4Scenes(scenes)).toBe(
      "what_matters Claude's, first_step Standard (it threw while drawing in the page), what_changes Standard (no Claude scene accepted)",
    )
  })
})
