import type { Brief, Chapter, Facts, Scene } from '@sherpas/shared'

/** What every scene component receives. Scenes are editable; this contract with `locked/Video.tsx` is not. */
export interface SceneProps {
  readonly brief: Brief
  readonly facts: Facts
  readonly scene: Scene
  readonly chapter: Chapter
  readonly durationInFrames: number
}
