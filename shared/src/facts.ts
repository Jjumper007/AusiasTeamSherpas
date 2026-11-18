import { z } from 'zod'

/**
 * Units a fact can have.
 * - `percent` values are stored as a fraction (0.49 means 49%), as in the case JSON.
 * - `calendar_year` (2044) is separate from `years` (17 years) so the number guard can ignore dates.
 */
export const FACT_UNITS = [
  'usd',
  'percent',
  'points',
  'years',
  'months',
  'calendar_year',
  'count',
] as const
export const FactUnitSchema = z.enum(FACT_UNITS)
export type FactUnit = z.infer<typeof FactUnitSchema>

const FACT_NAME_PATTERN = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/
export const FactNameSchema = z.string().regex(FACT_NAME_PATTERN, 'Fact names are SCREAMING_SNAKE_CASE')

/** One figure the video is allowed to say or show, with its exact, unrounded value from the case JSON. */
export const FactSchema = z.object({
  value: z.number(),
  unit: FactUnitSchema,
  label: z.string().min(1),
})
export type Fact = z.infer<typeof FactSchema>

/** Every figure a video may use, keyed by constant name. `facts.ts` is generated from this. */
export const FactsSchema = z.record(FactNameSchema, FactSchema)
export type Facts = z.infer<typeof FactsSchema>
