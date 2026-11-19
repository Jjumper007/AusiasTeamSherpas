import {
  ChapterSchema,
  CtaSchema,
  ScenesSchema,
  type Brief,
  type Chapter,
  type Cta,
  type Facts,
  type Scene,
  type Script,
} from '@sherpas/shared'
import type { z } from 'zod'
import { chapterProblems, ctaProblems, sceneProblems } from '../script/script-check'

/**
 * One part of the streamed script, checked on its own as soon as it closes (docs/specs/live-run.md):
 * parsed with the frozen zod pieces of the script, then the same per-part checks as `checkScript`.
 * A part that fails is replaced by the same part of the script without Claude. No retries.
 */

export type PartSource = 'claude' | 'fallback'

export interface ResolvedPart<T> {
  readonly value: T
  readonly source: PartSource
  /** Why Claude's version was not used; empty when it was. */
  readonly problems: readonly string[]
}

type Parsed<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly problems: string[] }

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error))

const parseJson = (text: string): Parsed<unknown> => {
  try {
    return { ok: true, value: JSON.parse(text) }
  } catch (error) {
    return { ok: false, problems: [`The answer is not valid JSON: ${errorMessage(error)}`] }
  }
}

/** Same wording as `checkScript`'s schema problems, with the part's place in the script as the path. */
const parseWith = <T>(schema: z.ZodType<T>, json: unknown, where: string): Parsed<T> => {
  const parsed = schema.safeParse(json)
  if (parsed.success) return { ok: true, value: parsed.data }
  return {
    ok: false,
    problems: parsed.error.issues.map((issue) => `Schema: ${[where, ...issue.path].join('.')}: ${issue.message}`),
  }
}

/** Claude's part when it parses and passes `check`, otherwise `fallback` with the reasons. */
const resolve = <T>(parsed: Parsed<T>, check: (value: T) => string[], fallback: T): ResolvedPart<T> => {
  if (!parsed.ok) return { value: fallback, source: 'fallback', problems: parsed.problems }
  const problems = check(parsed.value)
  return problems.length === 0
    ? { value: parsed.value, source: 'claude', problems: [] }
    : { value: fallback, source: 'fallback', problems }
}

const parseText = <T>(text: string, schema: z.ZodType<T>, where: string): Parsed<T> => {
  const json = parseJson(text)
  return json.ok ? parseWith(schema, json.value, where) : json
}

/** `scenes[index]`: its part must be the one of that position in the arc (the tuple's own item schema). */
export const resolveScene = (index: number, text: string, brief: Brief, facts: Facts, fallback: Script): ResolvedPart<Scene> =>
  resolve(
    parseText(text, ScenesSchema.def.items[index] as z.ZodType<Scene>, `scenes.${index}`),
    (scene) => sceneProblems(scene, brief, facts),
    fallback.scenes[index],
  )

export const resolveChapter = (index: number, text: string, facts: Facts, fallback: Script): ResolvedPart<Chapter> =>
  resolve(parseText(text, ChapterSchema, `chapters.${index}`), (chapter) => chapterProblems(chapter, facts), fallback.chapters[index])

/** `cta.type` is always the survey's decision style, as in `checkScript`: a wrong one is corrected, not rejected. */
export const resolveCta = (text: string, brief: Brief, facts: Facts, fallback: Script): ResolvedPart<Cta> => {
  const json = parseJson(text)
  const withType = json.ok && typeof json.value === 'object' && json.value !== null
    ? { ok: true as const, value: { ...json.value, type: brief.survey.decisionStyle } }
    : json
  const parsed = withType.ok ? parseWith(CtaSchema, withType.value, 'cta') : withType
  return resolve(parsed, (cta) => ctaProblems(cta, facts), fallback.cta)
}

/** The part of the script without Claude, for a part that never closed in the stream. */
export const missingPart = <T>(fallback: T, why: string): ResolvedPart<T> => ({ value: fallback, source: 'fallback', problems: [why] })
