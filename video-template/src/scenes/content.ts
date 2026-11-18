import type { Brief, DecisionStyle, TopicId } from '@sherpas/shared'

/** Plain words and choices the scenes share. Pure, so they are unit-tested. */

export const TOPIC_LABEL: Readonly<Record<TopicId, string>> = {
  retirement: 'Retirement',
  college: 'College',
  emergency_fund: 'Emergency fund',
  debt: 'Debt',
  protection: 'Protecting your family',
  home_purchase: 'Buying a home',
  investments: 'Investments',
}

/** "Emily", "Emily and Oliver", "Emily, Oliver and Sophia". */
export const joinNames = (names: readonly string[]): string =>
  names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`

/** Everyone in the household except the person the video is for. */
export const companionsOf = (brief: Brief): string[] =>
  brief.household.filter((person) => person.firstName !== brief.member.firstName).map((person) => person.firstName)

/** The other adult of the household, or null for someone living alone. */
export const partnerOf = (brief: Brief): string | null =>
  brief.household.find((person) => person.role !== 'child' && person.firstName !== brief.member.firstName)
    ?.firstName ?? null

/** The button at the end of the video: the same action as the card under it (SPEC §3). */
export const ctaButtonLabel = (style: DecisionStyle, partner: string | null): string => {
  switch (style) {
    case 'just_do_it':
      return 'Start now'
    case 'research_first':
      return 'Why this number?'
    case 'ask_trusted':
      return `Send this to ${partner ?? 'someone you trust'}`
    case 'wait':
      return 'Remind me'
  }
}

export type PillarTone = 'strong' | 'middle' | 'weak'

const STRONG_SHARE = 2 / 3
const MIDDLE_SHARE = 1 / 3

/** How healthy one area of the score is, from its share of the maximum points. */
export const pillarTone = (points: number, maxPoints: number): PillarTone => {
  const share = maxPoints > 0 ? points / maxPoints : 0
  if (share >= STRONG_SHARE) return 'strong'
  return share >= MIDDLE_SHARE ? 'middle' : 'weak'
}

const FIRST_REVEAL_SHARE = 0.1
const LAST_REVEAL_SHARE = 0.65

/**
 * Start frames for `count` items revealed one after another across the scene, so each figure
 * lands roughly while the narration reaches it instead of all at once at the start.
 */
export const spreadReveals = (
  count: number,
  durationInFrames: number,
  firstShare = FIRST_REVEAL_SHARE,
  lastShare = LAST_REVEAL_SHARE,
): number[] =>
  Array.from({ length: count }, (_, index) => {
    const share = count <= 1 ? firstShare : firstShare + ((lastShare - firstShare) * index) / (count - 1)
    return Math.round(durationInFrames * share)
  })
