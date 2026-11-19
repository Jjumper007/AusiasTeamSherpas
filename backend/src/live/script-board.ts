import type { Chapter, Cta, Scene, Script } from '@sherpas/shared'
import type { LiveLog } from './live-log'
import { missingPart, type ResolvedPart } from './script-parts'
import { SCENE_COUNT } from './scene-count'

/**
 * The Live script's parts as they resolve while Claude writes: each scene, chapter and the CTA is set
 * once (accepted or replaced), logged, and the scenes handed over at once. Whatever is not set yet comes
 * from the script without Claude.
 */

export interface ScriptBoard {
  readonly setScene: (index: number, part: ResolvedPart<Scene>, how: string) => void
  readonly setChapter: (index: number, part: ResolvedPart<Chapter>, how: string) => void
  readonly setCta: (part: ResolvedPart<Cta>, how: string) => void
  /** Sets every part still missing from the script without Claude, with `why` as its problem. */
  readonly fillMissing: (why: string) => void
  /** The script as known now: every resolved part, the rest from the script without Claude. */
  readonly script: () => Script
  /** Where each chapter and the CTA stand now: what `script()` carries for them. */
  readonly pageSources: () => PageSources
  /** How many parts were replaced by the script without Claude so far. */
  readonly replacedCount: () => number
}

/** A part as it stands: Claude's and accepted, replaced by the script without Claude, or not closed yet. */
export type PartState = 'claude' | 'replaced' | 'pending'

export interface PageSources {
  readonly chapters: readonly PartState[]
  readonly cta: PartState
}

interface Parts {
  readonly scenes: ReadonlyArray<ResolvedPart<Scene> | undefined>
  readonly chapters: ReadonlyArray<ResolvedPart<Chapter> | undefined>
  readonly cta?: ResolvedPart<Cta>
}

const NO_PARTS: Parts = { scenes: Array(SCENE_COUNT).fill(undefined), chapters: Array(SCENE_COUNT).fill(undefined) }

const placed = <T>(items: ReadonlyArray<T>, index: number, item: T): T[] => items.map((old, at) => (at === index ? item : old))

const verdict = (part: ResolvedPart<unknown>): string =>
  part.source === 'claude' ? 'accepted' : `replaced: ${part.problems.join(' | ')}`

const stateOf = (part: ResolvedPart<unknown> | undefined): PartState =>
  part === undefined ? 'pending' : part.source === 'claude' ? 'claude' : 'replaced'

const STATE_TEXT: Record<PartState, string> = {
  claude: 'from Claude',
  replaced: 'replaced, from the script without Claude',
  pending: 'not closed yet, from the script without Claude',
}

/** E.g. `chapters 1, 2, 3 from Claude; chapters 4, 5 not closed yet, from the script without Claude; CTA from Claude`. */
export const describePageSources = ({ chapters, cta }: PageSources): string => {
  const groups = (['claude', 'replaced', 'pending'] as const).flatMap((state) => {
    const numbers = chapters.flatMap((chapterState, index) => (chapterState === state ? [index + 1] : []))
    if (numbers.length === 0) return []
    return [`${numbers.length === 1 ? 'chapter' : 'chapters'} ${numbers.join(', ')} ${STATE_TEXT[state]}`]
  })
  return [...groups, `CTA ${STATE_TEXT[cta]}`].join('; ')
}

const scriptOf = (parts: Parts, fallback: Script): Script => ({
  scenes: fallback.scenes.map((scene, index) => parts.scenes[index]?.value ?? scene) as Script['scenes'],
  chapters: fallback.chapters.map((chapter, index) => parts.chapters[index]?.value ?? chapter) as Script['chapters'],
  cta: parts.cta?.value ?? fallback.cta,
})

export const createScriptBoard = (fallback: Script, log: LiveLog, onScene: (index: number, scene: Scene) => void): ScriptBoard => {
  let parts = NO_PARTS

  const setScene = (index: number, part: ResolvedPart<Scene>, how: string): void => {
    if (parts.scenes[index]) return
    parts = { ...parts, scenes: placed(parts.scenes, index, part) }
    log(`script: scene ${index + 1} (${part.value.part}) ${how}, ${verdict(part)}`)
    onScene(index, part.value)
  }

  const setChapter = (index: number, part: ResolvedPart<Chapter>, how: string): void => {
    if (parts.chapters[index]) return
    parts = { ...parts, chapters: placed(parts.chapters, index, part) }
    log(`script: chapter ${index + 1} ${how}, ${verdict(part)}`)
  }

  const setCta = (part: ResolvedPart<Cta>, how: string): void => {
    if (parts.cta) return
    parts = { ...parts, cta: part }
    log(`script: CTA ${how}, ${verdict(part)}`)
  }

  const fillMissing = (why: string): void => {
    fallback.scenes.forEach((scene, index) => setScene(index, missingPart(scene, why), 'missing'))
    fallback.chapters.forEach((chapter, index) => setChapter(index, missingPart(chapter, why), 'missing'))
    setCta(missingPart(fallback.cta, why), 'missing')
  }

  return {
    setScene,
    setChapter,
    setCta,
    fillMissing,
    script: () => scriptOf(parts, fallback),
    pageSources: () => ({ chapters: parts.chapters.map(stateOf), cta: stateOf(parts.cta) }),
    replacedCount: () => [...parts.scenes, ...parts.chapters, parts.cta].filter((part) => part?.source === 'fallback').length,
  }
}
