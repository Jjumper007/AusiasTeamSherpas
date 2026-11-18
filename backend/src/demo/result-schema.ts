import { ChapterSchema, CtaSchema, SurveySchema, TopMoveSchema } from '@sherpas/shared'
import { z } from 'zod'
import type { JobResult } from '../api/types'

/**
 * A `result.json` read back from disk (the demo folder, a run folder). The file is untrusted: it is
 * checked before the player page gets it. Results written before the first-step figures existed
 * have no `firstStepScore` or `waitGap`; they read as null, which the card shows as "no figure".
 */

const FactDetailSchema = z.object({ name: z.string().min(1), label: z.string().min(1), value: z.string().min(1) })

export const JobResultSchema = z.object({
  runId: z.string().min(1),
  caseId: z.string().min(1),
  member: z.string().min(1),
  name: z.string().min(1),
  partner: z.string().min(1).nullable(),
  survey: SurveySchema,
  videoUrl: z.string().min(1),
  durationSec: z.number().positive(),
  chapters: z.array(ChapterSchema.extend({ startSec: z.number().nonnegative() })).min(1),
  cta: CtaSchema,
  firstStep: TopMoveSchema,
  firstStepScore: z.object({ now: z.string().min(1), after: z.string().min(1) }).nullable().default(null),
  waitGap: FactDetailSchema.nullable().default(null),
  detail: z.array(FactDetailSchema),
}) satisfies z.ZodType<JobResult>
