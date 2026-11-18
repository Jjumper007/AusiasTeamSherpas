import { z } from 'zod'
import { FactNameSchema } from './facts'
import { DecisionStyleSchema } from './survey'

/** The fixed five-part arc of every video. Claude fills each part but never reorders them. */
export const PARTS = ['hook', 'where_you_are', 'what_matters', 'first_step', 'what_changes'] as const
export type Part = (typeof PARTS)[number]

const sceneFor = <P extends Part>(part: P) =>
  z.object({
    part: z.literal(part),
    narration: z.string().min(1),
    visualIdea: z.string().min(1),
    factsUsed: z.array(FactNameSchema),
  })

/** Exactly five scenes, one per part, in arc order. */
export const ScenesSchema = z.tuple([
  sceneFor('hook'),
  sceneFor('where_you_are'),
  sceneFor('what_matters'),
  sceneFor('first_step'),
  sceneFor('what_changes'),
])
export type Scene = z.infer<typeof ScenesSchema>[number]

/** Text shown under the video for one scene: 2–3 sentences at the chosen explain level. */
export const ChapterSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
})
export type Chapter = z.infer<typeof ChapterSchema>

/** One chapter per scene, in the same order. */
export const ChaptersSchema = z.tuple([
  ChapterSchema,
  ChapterSchema,
  ChapterSchema,
  ChapterSchema,
  ChapterSchema,
])

/** The call to action, shaped by the decision style from the survey. */
export const CtaSchema = z.object({
  type: DecisionStyleSchema,
  text: z.string().min(1),
})
export type Cta = z.infer<typeof CtaSchema>

export const ScriptSchema = z.object({
  scenes: ScenesSchema,
  chapters: ChaptersSchema,
  cta: CtaSchema,
})
export type Script = z.infer<typeof ScriptSchema>
