import {
  ScriptSchema,
  validateNarration,
  type Brief,
  type Chapter,
  type Cta,
  type Facts,
  type Scene,
  type Script,
} from '@sherpas/shared'
import { SCORE_FACT, scoreAfterFactName } from './fallback-script'

/**
 * Checks a script Claude wrote (SPEC §5.2, §5.5). Every problem is a sentence that goes back to
 * Claude in the retry, so it says what is wrong and how to fix it.
 */

/** About 8 seconds of speech: the hook's limit in SPEC §4. The prompt asks for 18 to leave room. */
export const MAX_HOOK_WORDS = 20
/** About 100 seconds of speech, under the 120 s limit of the video validator. */
export const MAX_NARRATION_WORDS = 250

export type ScriptCheck =
  | { readonly ok: true; readonly script: Script }
  | { readonly ok: false; readonly problems: readonly string[] }

const wordCount = (text: string): number => text.split(/\s+/).filter(Boolean).length

/** Every text of a script that is said or shown: narration, chapters and the call to action. */
export const scriptTexts = (script: Script): string[] => [
  ...script.scenes.map((scene) => scene.narration),
  ...script.chapters.flatMap((chapter) => [chapter.title, chapter.body]),
  script.cta.text,
]

/** The number guard over one text: figures that do not come from facts. */
const textFigureProblems = (text: string, facts: Facts): string[] =>
  validateNarration(text, facts).errors.map((error) => error.message)

/** The number guard over the whole script: figures that do not come from facts. */
export const figureProblems = (script: Script, facts: Facts): string[] =>
  scriptTexts(script).flatMap((text) => textFigureProblems(text, facts))

/** Index just after the object that opens at `start`, skipping braces inside strings; -1 if it never closes. */
const objectEnd = (text: string, start: number): number => {
  let depth = 0
  let inString = false
  for (let index = start; index < text.length; index += 1) {
    const char = text[index]
    if (inString) {
      if (char === '\\') index += 1
      else if (char === '"') inString = false
    } else if (char === '"') inString = true
    else if (char === '{') depth += 1
    else if (char === '}' && --depth === 0) return index + 1
  }
  return -1
}

/** The first JSON object in Claude's answer, tolerating Markdown fences or prose around it. */
export const extractJson = (answer: string): unknown => {
  const start = answer.indexOf('{')
  const end = start === -1 ? -1 : objectEnd(answer, start)
  if (end === -1) throw new Error('The answer has no complete JSON object.')
  return JSON.parse(answer.slice(start, end))
}

const parseAnswer = (answer: string): { script?: Script; problems: string[] } => {
  let json: unknown
  try {
    json = extractJson(answer)
  } catch (error) {
    return { problems: [`The answer is not valid JSON: ${error instanceof Error ? error.message : String(error)}`] }
  }
  const parsed = ScriptSchema.safeParse(json)
  if (parsed.success) return { script: parsed.data, problems: [] }
  return {
    problems: parsed.error.issues.map((issue) => `Schema: ${issue.path.join('.') || '(root)'}: ${issue.message}`),
  }
}

/**
 * One rule over one scene. A scene names its own part, so each rule needs only the scene, the brief
 * and the facts: the Live run checks every scene on its own as it arrives (docs/specs/live-run.md).
 */
type SceneRule = (scene: Scene, brief: Brief, facts: Facts) => string[]

const hookRule: SceneRule = (scene, brief) => {
  if (scene.part !== 'hook') return []
  const { nickname } = brief.survey
  const hook = scene.narration
  const problems: string[] = []
  if (!hook.toLowerCase().includes(nickname.toLowerCase())) {
    problems.push(`The hook must call them by their nickname, "${nickname}".`)
  }
  if (wordCount(hook) > MAX_HOOK_WORDS) {
    problems.push(`The hook has ${wordCount(hook)} words; keep it to 18 or fewer (about 8 seconds).`)
  }
  return problems
}

const knownFactsRule: SceneRule = (scene, _brief, facts) =>
  scene.factsUsed
    .filter((name) => !(name in facts))
    .map((name) => `Scene "${scene.part}" declares ${name} in factsUsed, which is not in the list of facts.`)

/** The video reads the score from the first `points` facts of parts 2 and 5 (scene-facts.ts). */
const scoreFactsRule: SceneRule = (scene, brief, facts) => {
  if (scene.part === 'where_you_are' && scene.factsUsed[0] !== SCORE_FACT) {
    return [`Scene "where_you_are" must list ${SCORE_FACT} first in factsUsed.`]
  }
  if (scene.part !== 'what_changes') return []
  const [move] = brief.topMoves
  const afterFact = scoreAfterFactName(move)
  const lifts = move.scoreAfter > move.scoreBefore && afterFact in facts
  if (lifts && (scene.factsUsed[0] !== SCORE_FACT || scene.factsUsed[1] !== afterFact)) {
    return [`Scene "what_changes" must start factsUsed with ${SCORE_FACT} then ${afterFact}.`]
  }
  return []
}

const figuresRule: SceneRule = (scene, _brief, facts) => textFigureProblems(scene.narration, facts)

/** In the order `checkScript` reports them: every hook problem first, then every unknown fact, and so on. */
const SCENE_RULES: readonly SceneRule[] = [hookRule, knownFactsRule, scoreFactsRule, figuresRule]

/** What is wrong with one scene alone: hook, `factsUsed`, score facts and the number guard. */
export const sceneProblems = (scene: Scene, brief: Brief, facts: Facts): string[] =>
  SCENE_RULES.flatMap((rule) => rule(scene, brief, facts))

/** What is wrong with one chapter alone: figures in its title or body that do not come from facts. */
export const chapterProblems = (chapter: Chapter, facts: Facts): string[] =>
  [chapter.title, chapter.body].flatMap((text) => textFigureProblems(text, facts))

/** What is wrong with the call to action alone: figures that do not come from facts. */
export const ctaProblems = (cta: Cta, facts: Facts): string[] => textFigureProblems(cta.text, facts)

/** A whole-script rule: the parts can each be fine and still add up to a video that is too long. */
const lengthProblems = (script: Script): string[] => {
  const words = script.scenes.reduce((total, scene) => total + wordCount(scene.narration), 0)
  return words > MAX_NARRATION_WORDS
    ? [`The narration has ${words} words in total; keep it between 150 and 220.`]
    : []
}

/** The per-part checks over the whole script, grouped by rule across the scenes, then the total length. */
const scriptProblems = (script: Script, brief: Brief, facts: Facts): string[] => [
  ...SCENE_RULES.flatMap((rule) => script.scenes.flatMap((scene) => rule(scene, brief, facts))),
  ...script.chapters.flatMap((chapter) => chapterProblems(chapter, facts)),
  ...ctaProblems(script.cta, facts),
  ...lengthProblems(script),
]

/**
 * Parses and checks Claude's answer. The call to action always takes the survey's decision style,
 * so a wrong `cta.type` is corrected rather than retried.
 */
export const checkScript = (answer: string, brief: Brief, facts: Facts): ScriptCheck => {
  const { script: parsed, problems: parseProblems } = parseAnswer(answer)
  if (!parsed) return { ok: false, problems: parseProblems }

  const script: Script = { ...parsed, cta: { ...parsed.cta, type: brief.survey.decisionStyle } }
  const problems = scriptProblems(script, brief, facts)
  return problems.length === 0 ? { ok: true, script } : { ok: false, problems }
}
