import type { Script, SceneTiming, VideoProps } from '@sherpas/shared'

/**
 * Scene lengths before there is a voice (#7 replaces them with the measured audio).
 * Narration is read at about 2.5 words a second, plus a pause between scenes. The hook stays
 * within 8 s (SPEC §4) and the whole video lasts at least 60 s, so slow scenes are stretched evenly.
 */
export const WORDS_PER_SECOND = 2.5
export const SCENE_PAUSE_SEC = 1
export const MIN_SCENE_SEC = 6
export const MAX_HOOK_SEC = 8
export const MIN_VIDEO_SEC = 60

const TENTHS = 10
/** Rounds up, so rounding never takes the video below `MIN_VIDEO_SEC` or a scene below its narration. */
const ceilToTenth = (seconds: number): number => Math.ceil(seconds * TENTHS - 1e-9) / TENTHS

const wordCount = (text: string): number => text.split(/\s+/).filter(Boolean).length

const readingSeconds = (narration: string): number =>
  Math.max(MIN_SCENE_SEC, wordCount(narration) / WORDS_PER_SECOND + SCENE_PAUSE_SEC)

/** Stretches the scenes after the hook so the video reaches `MIN_VIDEO_SEC`. */
const stretchToMinimum = (hook: number, rest: ReadonlyArray<number>): number[] => {
  const restTotal = rest.reduce((sum, seconds) => sum + seconds, 0)
  const missing = MIN_VIDEO_SEC - hook - restTotal
  if (missing <= 0) return [...rest]
  return rest.map((seconds) => seconds + (missing * seconds) / restTotal)
}

/** One silent timing per scene, in script order. */
export const estimateSceneTimings = (script: Script): VideoProps['scenes'] => {
  const [hookScene, ...restScenes] = script.scenes
  const hook = ceilToTenth(Math.min(MAX_HOOK_SEC, readingSeconds(hookScene.narration)))
  const rest = stretchToMinimum(hook, restScenes.map((scene) => readingSeconds(scene.narration)))
  const timing = (seconds: number): SceneTiming => ({ durationSec: ceilToTenth(seconds) })
  return [timing(hook), timing(rest[0]), timing(rest[1]), timing(rest[2]), timing(rest[3])]
}
