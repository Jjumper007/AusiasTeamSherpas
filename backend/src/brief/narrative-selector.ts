import type { TopicId } from '@sherpas/shared'

/** Texts every brief carries, whatever the survey says. */
const SUMMARY_KEYS = ['summary_main', 'summary_recommendations'] as const

/** `narrative.*` texts that speak to each topic, most relevant first. */
const NARRATIVE_KEYS_BY_TOPIC: Readonly<Record<TopicId, ReadonlyArray<string>>> = {
  retirement: ['retirement_short_observations', 'retirement_what_to_look_into'],
  college: ['savings_short_observations', 'savings_what_to_look_into', 'assets_what_to_look_into'],
  emergency_fund: ['protection_emergency_fund_short_observations', 'savings_what_to_look_into', 'protection_intro'],
  debt: ['debt_short_observations', 'debt_what_to_look_into'],
  protection: [
    'protection_life_insurance_short_observations',
    'protection_umbrella_short_observations',
    'protection_intro',
  ],
  home_purchase: [
    'protection_emergency_fund_short_observations',
    'savings_short_observations',
    'debt_what_to_look_into',
  ],
  investments: ['assets_short_observations', 'assets_what_to_look_into'],
}

/**
 * Characters of topic text allowed on top of the summaries. The 14 narrative texts add up to
 * about 11 KB, so the brief only carries the summaries plus what fits here for the chosen topic.
 */
export const TOPIC_NARRATIVE_BUDGET_CHARS = 1_600

interface Selection {
  readonly keys: ReadonlyArray<string>
  readonly remaining: number
}

const addIfItFits =
  (narrative: Readonly<Record<string, string>>) =>
  (selection: Selection, key: string): Selection => {
    const text = narrative[key]
    if (text === undefined || text.length > selection.remaining) return selection
    return { keys: [...selection.keys, key], remaining: selection.remaining - text.length }
  }

/**
 * Picks the narrative texts for a brief: always the summaries, plus the texts for `topic`
 * in order of relevance while they fit the budget. With no topic (the plan does not cover
 * the one chosen in the survey) only the summaries are returned.
 */
export const selectNarrative = (
  narrative: Readonly<Record<string, string>>,
  topic: TopicId | undefined,
): Record<string, string> => {
  const topicKeys = topic === undefined ? [] : NARRATIVE_KEYS_BY_TOPIC[topic]
  const chosen = topicKeys.reduce(addIfItFits(narrative), { keys: [], remaining: TOPIC_NARRATIVE_BUDGET_CHARS })
  const keys = [...SUMMARY_KEYS.filter((key) => narrative[key] !== undefined), ...chosen.keys]
  return Object.fromEntries(keys.map((key) => [key, narrative[key]]))
}
