import type { Fact, Facts, TopicId } from '@sherpas/shared'
import { toConstantName } from '../brief/facts/fact-builders'

/** A fact together with the constant name the script declares in `factsUsed`. */
export interface NamedFact {
  readonly name: string
  readonly fact: Fact
}

/**
 * Facts that speak to each topic, most telling first. `member` is the person's first name in
 * constant form ("DANIEL"), for the facts that are per person. Names a case does not have are skipped.
 */
const FACT_NAMES_BY_TOPIC: Readonly<Record<TopicId, (member: string) => ReadonlyArray<string>>> = {
  retirement: () => [
    'RETIREMENT_GAP',
    'RETIREMENT_EXTRA_SAVING_PER_YEAR',
    'FREE_CASH_FLOW_PER_YEAR',
    'RETIREMENT_INCOME_SHARE_OF_NEED',
    'SAVINGS_LEFT_AT_PLAN_END',
  ],
  college: () => [
    'EDUCATION_FUNDING_GAP',
    'EDUCATION_TOTAL_COST_ALL_GOALS',
    'COLLEGE_529_BALANCE',
    'COLLEGE_529_SAVING_PER_YEAR',
  ],
  emergency_fund: () => [
    'CASH_GAP_TO_TARGET',
    'CASH_ACCESSIBLE_CASH',
    'EMERGENCY_RESERVE_MONTHS_RECOMMENDED_MIN',
    'CASH_TOTAL_CASH_NEEDED_MIN',
  ],
  debt: () => ['TOTAL_DEBT', 'CREDIT_CARD_BALANCE', 'CREDIT_CARD_INTEREST_RATE', 'DEBT_PAYMENTS_PER_MONTH', 'DEBT_TO_INCOME'],
  protection: (member) => [
    `${member}_LIFE_COVER_SHORTFALL`,
    `${member}_LIFE_COVER`,
    `${member}_LIFE_COVER_RECOMMENDED_MIN`,
    'UMBRELLA_COVER_RECOMMENDED',
  ],
  home_purchase: () => ['HOME_DOWN_PAYMENT', 'HOME_PURCHASE_YEAR', 'CASH_ACCESSIBLE_CASH'],
  investments: () => ['INVESTABLE_ASSETS', 'NET_WORTH', 'SAVINGS_RATE', 'RETIREMENT_WITHDRAWAL_RATE_AVERAGE'],
}

/**
 * The facts about a topic that a video can say. Zero and negative values are left out: they read
 * as noise ("umbrella cover today: $0") or are artefacts of the case data.
 */
export const topicFacts = (facts: Facts, topic: TopicId, memberFirstName: string): NamedFact[] =>
  FACT_NAMES_BY_TOPIC[topic](toConstantName(memberFirstName))
    .filter((name) => (facts[name]?.value ?? 0) > 0)
    .map((name) => ({ name, fact: facts[name] }))
