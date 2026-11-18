import { fmt, type Fact, type Facts, type TopMove } from '@sherpas/shared'
import type { FactDetail, ScoreChange } from '../api/types'
import { toConstantName } from '../brief/facts/fact-builders'
import { SCORE_FACT, scoreAfterFactName } from '../script/fallback-script'

/**
 * The figures on the first-step card (SPEC §1, §3), read from the facts and formatted with `fmt`,
 * never from the numbers of `brief.topMoves[0]`. Nothing here is computed: every value is one fact.
 */

const factNamed = (facts: Facts, name: string): Fact | null => (Object.hasOwn(facts, name) ? facts[name] : null)

/** Score today → score after the first step on its own. null when either fact is missing or the step does not lift it. */
export const firstStepScore = (move: TopMove, facts: Facts): ScoreChange | null => {
  const now = factNamed(facts, SCORE_FACT)
  const after = factNamed(facts, scoreAfterFactName(move))
  if (!now || !after || after.value <= now.value) return null
  return { now: fmt.fact(now), after: fmt.fact(after) }
}

/** The dollar amount written in the move's action: RAISE_MORTALITY_COVERAGE_AMOUNT. */
const moveAmountFactName = (move: TopMove): string => `${toConstantName(move.title)}_AMOUNT`

/** Which existing fact names the gap a kind of first step leaves open, and how the card labels it. */
interface WaitGapRule {
  readonly matches: RegExp
  readonly factName: (move: TopMove) => string
  readonly label: string
}

/**
 * First match wins. The life and umbrella rules use the amount in the move's own action, so the card
 * repeats the figure the person just read ("Add $1,166,000 of life cover…"). A card move points at the
 * card's whole balance, which keeps charging interest while they wait.
 */
const WAIT_GAP_RULES: ReadonlyArray<WaitGapRule> = [
  { matches: /revolving|credit card|\bcard\b/i, factName: () => 'CREDIT_CARD_BALANCE', label: 'Card balance still charging interest' },
  { matches: /mortality|life cover/i, factName: moveAmountFactName, label: 'Life cover still missing' },
  { matches: /umbrella/i, factName: moveAmountFactName, label: 'Umbrella cover still missing' },
]

/** "What waiting costs" for the `wait` card. null when no rule fits the move or its fact is missing or zero. */
export const waitGap = (move: TopMove, facts: Facts): FactDetail | null => {
  const rule = WAIT_GAP_RULES.find((candidate) => candidate.matches.test(move.title))
  if (!rule) return null
  const name = rule.factName(move)
  const fact = factNamed(facts, name)
  if (!fact || fact.value <= 0) return null
  return { name, label: rule.label, value: fmt.fact(fact) }
}
