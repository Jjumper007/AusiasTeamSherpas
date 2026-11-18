import { TOPIC_IDS, type TopicId } from '@sherpas/shared'
import type { CaseData } from './case-loader'

/** Goal types (or purchase sub-types) in the plan that put a topic on the table. */
const TOPIC_BY_GOAL_TYPE: Readonly<Record<string, TopicId>> = {
  RETIREMENT: 'retirement',
  COLLEGE: 'college',
  REAL_ESTATE_PURCHASE: 'home_purchase',
}

/** Words in a concern title (O1–O8 in `persona.md`) that put a topic on the table. */
const CONCERN_TITLE_PATTERN_BY_TOPIC: Readonly<Record<TopicId, RegExp>> = {
  retirement: /retire/i,
  college: /college|education/i,
  emergency_fund: /cash reserve|thin reserve|thin cash|emergency/i,
  debt: /debt|card|loan/i,
  protection: /insurance|umbrella/i,
  home_purchase: /home purchase|purchase a home/i,
  investments: /portfolio|concentrat|holdings/i,
}

const topicsFromGoals = ({ plan }: CaseData): TopicId[] =>
  plan.goals.goalsSummary
    .map((goal) => TOPIC_BY_GOAL_TYPE[goal.subType ?? goal.goalType])
    .filter((topic): topic is TopicId => topic !== undefined)

const topicsFromConcerns = ({ persona }: CaseData): TopicId[] =>
  TOPIC_IDS.filter((topic) =>
    persona.concerns.some((concern) => CONCERN_TITLE_PATTERN_BY_TOPIC[topic].test(concern.title)),
  )

/**
 * Topics this case's plan covers: the ones behind a stated goal or an objective concern.
 * Returned in the fixed `TOPIC_IDS` order.
 */
export const coveredTopics = (caseData: CaseData): TopicId[] => {
  const covered = new Set<TopicId>([...topicsFromGoals(caseData), ...topicsFromConcerns(caseData)])
  return TOPIC_IDS.filter((topic) => covered.has(topic))
}
