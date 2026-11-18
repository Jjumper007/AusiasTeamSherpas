import type { Brief, Chapter, Cta, Facts, Scene } from '@sherpas/shared'

/**
 * What every scene component receives. Scenes draw the presentation screen at 1500×900
 * (`SCREEN_CONTENT`); they are editable, but this contract with `locked/stage/Screen.tsx` is not.
 */
export interface SceneProps {
  readonly brief: Brief
  readonly facts: Facts
  readonly scene: Scene
  readonly chapter: Chapter
  readonly cta: Cta
  readonly durationInFrames: number
}
