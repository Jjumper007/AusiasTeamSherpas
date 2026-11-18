import { ScriptSchema, validateNarration, type Brief, type Facts, type Script } from '@sherpas/shared'
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

/** The number guard over the whole script: figures that do not come from facts. */
export const figureProblems = (script: Script, facts: Facts): string[] =>
  scriptTexts(script).flatMap((text) => validateNarration(text, facts).errors.map((error) => error.message))

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

const unknownFacts = (script: Script, facts: Facts): string[] =>
  script.scenes.flatMap((scene) =>
    scene.factsUsed
      .filter((name) => !(name in facts))
      .map((name) => `Scene "${scene.part}" declares ${name} in factsUsed, which is not in the list of facts.`),
  )

/** The video reads the score from the first `points` facts of parts 2 and 5 (scene-facts.ts). */
const scoreFactProblems = (script: Script, brief: Brief, facts: Facts): string[] => {
  const [, where, , , changes] = script.scenes
  const [move] = brief.topMoves
  const afterFact = scoreAfterFactName(move)
  const lifts = move.scoreAfter > move.scoreBefore && afterFact in facts
  const problems: string[] = []
  if (where.factsUsed[0] !== SCORE_FACT) {
    problems.push(`Scene "where_you_are" must list ${SCORE_FACT} first in factsUsed.`)
  }
  if (lifts && (changes.factsUsed[0] !== SCORE_FACT || changes.factsUsed[1] !== afterFact)) {
    problems.push(`Scene "what_changes" must start factsUsed with ${SCORE_FACT} then ${afterFact}.`)
  }
  return problems
}

const hookProblems = (script: Script, brief: Brief): string[] => {
  const { nickname } = brief.survey
  const hook = script.scenes[0].narration
  const problems: string[] = []
  if (!hook.toLowerCase().includes(nickname.toLowerCase())) {
    problems.push(`The hook must call them by their nickname, "${nickname}".`)
  }
  if (wordCount(hook) > MAX_HOOK_WORDS) {
    problems.push(`The hook has ${wordCount(hook)} words; keep it to 18 or fewer (about 8 seconds).`)
  }
  return problems
}

const lengthProblems = (script: Script): string[] => {
  const words = script.scenes.reduce((total, scene) => total + wordCount(scene.narration), 0)
  return words > MAX_NARRATION_WORDS
    ? [`The narration has ${words} words in total; keep it between 150 and 220.`]
    : []
}

/**
 * Parses and checks Claude's answer. The call to action always takes the survey's decision style,
 * so a wrong `cta.type` is corrected rather than retried.
 */
export const checkScript = (answer: string, brief: Brief, facts: Facts): ScriptCheck => {
  const { script: parsed, problems: parseProblems } = parseAnswer(answer)
  if (!parsed) return { ok: false, problems: parseProblems }

  const script: Script = { ...parsed, cta: { ...parsed.cta, type: brief.survey.decisionStyle } }
  const problems = [
    ...hookProblems(script, brief),
    ...unknownFacts(script, facts),
    ...scoreFactProblems(script, brief, facts),
    ...figureProblems(script, facts),
    ...lengthProblems(script),
  ]
  return problems.length === 0 ? { ok: true, script } : { ok: false, problems }
}
