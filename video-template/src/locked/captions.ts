import type { Caption, SceneTiming } from '@sherpas/shared'

/** Words per on-screen cue when the narration has no timed captions yet. */
const MAX_WORDS_PER_CUE = 7

const chunkWords = (words: readonly string[]): string[] =>
  words.length === 0
    ? []
    : [
        words.slice(0, MAX_WORDS_PER_CUE).join(' '),
        ...chunkWords(words.slice(MAX_WORDS_PER_CUE)),
      ]

/** Spreads cues over the scene, giving each one time in proportion to its length. */
const spreadOverScene = (texts: readonly string[], durationSec: number): Caption[] => {
  const totalChars = texts.reduce((total, text) => total + text.length, 0)
  return texts.reduce<Caption[]>((cues, text) => {
    const startSec = cues.at(-1)?.endSec ?? 0
    const endSec = startSec + (text.length / totalChars) * durationSec
    return [...cues, { text, startSec, endSec }]
  }, [])
}

/**
 * Caption cues for one scene, timed from the start of the scene.
 * Uses the voice-synced captions when present; otherwise splits the narration evenly so a silent render still reads.
 */
export const cuesForScene = (narration: string, timing: SceneTiming): readonly Caption[] => {
  if (timing.captions && timing.captions.length > 0) return timing.captions

  const words = narration.split(/\s+/).filter((word) => word.length > 0)
  return spreadOverScene(chunkWords(words), timing.durationSec)
}

export const activeCue = (cues: readonly Caption[], timeSec: number): Caption | undefined =>
  cues.find((cue) => timeSec >= cue.startSec && timeSec < cue.endSec)
