import { z } from 'zod'

const MAX_NICKNAME_LENGTH = 30

/** How technical the explanation is. Changes part 3 of the video the most. */
export const EXPLAIN_LEVELS = ['simple', 'straight', 'nerd'] as const
export const ExplainLevelSchema = z.enum(EXPLAIN_LEVELS)
export type ExplainLevel = z.infer<typeof ExplainLevelSchema>

/** Closed list of topics for "What's on your mind most?". Each case only offers the ones its plan covers. */
export const TOPIC_IDS = [
  'retirement',
  'college',
  'emergency_fund',
  'debt',
  'protection',
  'home_purchase',
  'investments',
] as const
export const TopicIdSchema = z.enum(TOPIC_IDS)
export type TopicId = z.infer<typeof TopicIdSchema>

/** Answer to "When you make a big money decision, you…". Decides the call to action and overrides D5. */
export const DECISION_STYLES = ['just_do_it', 'research_first', 'ask_trusted', 'wait'] as const
export const DecisionStyleSchema = z.enum(DECISION_STYLES)
export type DecisionStyle = z.infer<typeof DecisionStyleSchema>

export const SurveySchema = z.object({
  nickname: z.string().trim().min(1).max(MAX_NICKNAME_LENGTH),
  explainLevel: ExplainLevelSchema,
  topOfMind: TopicIdSchema,
  decisionStyle: DecisionStyleSchema,
})
export type Survey = z.infer<typeof SurveySchema>

/** One selectable option for "What's on your mind most?", generated per case in plain language. */
export const SurveyOptionSchema = z.object({
  id: TopicIdSchema,
  label: z.string().min(1),
})
export type SurveyOption = z.infer<typeof SurveyOptionSchema>
