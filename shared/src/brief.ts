import { z } from 'zod'
import { SurveySchema } from './survey'

const PILLAR_COUNT = 5
const MAX_TOP_MOVES = 3

/** The adult the video is for. Children never get their own video. */
export const MemberSchema = z.object({
  firstName: z.string().min(1),
  role: z.enum(['client', 'co-client']),
  age: z.number().int().positive(),
  retirementAge: z.number().int().positive(),
  riskProfile: z.string().min(1),
})
export type Member = z.infer<typeof MemberSchema>

/** Everyone in the household, children included, so they can appear in the story. */
export const HouseholdPersonSchema = z.object({
  firstName: z.string().min(1),
  role: z.enum(['client', 'co-client', 'child']),
  age: z.number().int().nonnegative(),
})
export type HouseholdPerson = z.infer<typeof HouseholdPersonSchema>

export const PillarSchema = z.object({
  name: z.string().min(1),
  points: z.number().nonnegative(),
  maxPoints: z.number().positive(),
})
export type Pillar = z.infer<typeof PillarSchema>

export const ScoreSchema = z.object({
  value: z.number().min(0).max(100),
  band: z.string().min(1),
  pillars: z.array(PillarSchema).length(PILLAR_COUNT),
})
export type Score = z.infer<typeof ScoreSchema>

/** One of the plan's highest-impact actions: a stretch of the mountain trail. */
export const TopMoveSchema = z.object({
  title: z.string().min(1),
  action: z.string().min(1),
  effort: z.enum(['low', 'medium', 'high']),
  scoreBefore: z.number(),
  scoreAfter: z.number(),
})
export type TopMove = z.infer<typeof TopMoveSchema>

export const GoalSchema = z.object({
  type: z.string().min(1),
  text: z.string().min(1),
  amount: z.number().optional(),
})
export type Goal = z.infer<typeof GoalSchema>

/** The D0–D6 classification block from `persona.md`. The survey's decision style overrides D5. */
export const ClassificationSchema = z.object({
  D0: z.string(),
  D1: z.string(),
  D2: z.string(),
  D3: z.string(),
  D4: z.string(),
  D5: z.string(),
  D6: z.string(),
})
export type Classification = z.infer<typeof ClassificationSchema>

/** An objective concern (O1–O8) from `persona.md`. */
export const ConcernSchema = z.object({
  id: z.string().regex(/^O\d+$/),
  title: z.string().min(1),
  severity: z.string().min(1),
  text: z.string().min(1),
})
export type Concern = z.infer<typeof ConcernSchema>

/** A tension (T1–T5) between concerns, from `persona.md`. */
export const TensionSchema = z.object({
  id: z.string().regex(/^T\d+$/),
  level: z.string().min(1),
  text: z.string().min(1),
})
export type Tension = z.infer<typeof TensionSchema>

/** Everything Claude needs to write one person's script: the case, distilled, plus their survey. */
export const BriefSchema = z.object({
  caseId: z.string().min(1),
  member: MemberSchema,
  household: z.array(HouseholdPersonSchema).min(1),
  score: ScoreSchema,
  topMoves: z.array(TopMoveSchema).min(1).max(MAX_TOP_MOVES),
  goals: z.array(GoalSchema),
  narrative: z.record(z.string(), z.string()),
  classification: ClassificationSchema,
  concerns: z.array(ConcernSchema),
  tensions: z.array(TensionSchema),
  survey: SurveySchema,
})
export type Brief = z.infer<typeof BriefSchema>
