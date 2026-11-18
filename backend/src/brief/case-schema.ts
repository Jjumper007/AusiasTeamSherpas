import { z } from 'zod'

/** The parts of `financial-health.json` this module reads. Everything else in the file is ignored. */

const RawPersonSchema = z.object({
  first_name: z.string().min(1),
  role: z.enum(['client', 'co-client', 'child']),
  age: z.number(),
  retirement_age: z.number().optional(),
  risk_profile: z.string().optional(),
})
export type RawPerson = z.infer<typeof RawPersonSchema>

const RawPillarSchema = z.object({
  pillar: z.string().min(1),
  points_shown_in_app: z.string().min(1),
})

const RawTopMoveSchema = z.object({
  title: z.string().min(1),
  action: z.string().min(1),
  effort: z.enum(['low', 'medium', 'high']),
  score_before: z.number(),
  score_after: z.number(),
})
export type RawTopMove = z.infer<typeof RawTopMoveSchema>

const RawCombinedMoveSchema = z.object({
  moves: z.array(z.string().min(1)).min(1),
  score_after: z.number(),
})

const RawGoalSummarySchema = z.object({
  goalType: z.string().min(1),
  subType: z.string().optional(),
  value: z.string().min(1),
  amount: z.number().optional(),
})
export type RawGoalSummary = z.infer<typeof RawGoalSummarySchema>

const RawChartGoalSchema = z.object({
  goalType: z.string().min(1),
  date: z.string().min(1),
})

const RawProfileGoalSchema = z.object({
  type: z.string().min(1),
  start_year: z.number().optional(),
  yearly_costs: z.array(z.object({ name: z.string(), yearly: z.number() })).default([]),
})

const RawLiabilitySchema = z.object({
  type: z.string().min(1),
  balance: z.number(),
  interest_rate: z.number(),
})

export const PlanSchema = z.object({
  case: z.object({ household: z.array(RawPersonSchema).min(1) }),
  score: z.object({
    published_score: z.number(),
    band: z.string().min(1),
    pillars: z.array(RawPillarSchema),
    top_moves: z.array(RawTopMoveSchema).min(1),
    combined_moves: z.array(RawCombinedMoveSchema).default([]),
  }),
  goals: z.object({
    goalsSummary: z.array(RawGoalSummarySchema),
    chartGoals: z.array(RawChartGoalSchema).default([]),
  }),
  profile: z.object({
    goals: z.array(RawProfileGoalSchema).default([]),
    liabilities: z.array(RawLiabilitySchema).default([]),
  }),
  narrative: z.record(z.string(), z.string()),
  key_metrics: z.record(z.string(), z.unknown()),
})
export type Plan = z.infer<typeof PlanSchema>
