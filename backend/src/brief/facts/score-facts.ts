import type { Plan, RawTopMove } from '../case-schema'
import { parsePillarPoints } from '../pillar-points'
import { factEntry, toConstantName, type FactEntry } from './fact-builders'

const THOUSAND = 1_000
const MILLION = 1_000_000
const MULTIPLIER_BY_SUFFIX: Readonly<Record<string, number>> = { K: THOUSAND, M: MILLION }

/** A dollar amount inside a sentence: "$1,166,000", "$15,032/year", "$1M". */
const DOLLAR_AMOUNT_PATTERN = /\$(\d[\d,]*(?:\.\d+)?)([KM])?/g

/** Every dollar amount written in a text, as plain numbers, in reading order. */
export const dollarAmountsIn = (text: string): number[] =>
  [...text.matchAll(DOLLAR_AMOUNT_PATTERN)].map(
    (match) => Number(match[1].replaceAll(',', '')) * (MULTIPLIER_BY_SUFFIX[match[2] ?? ''] ?? 1),
  )

const pillarFacts = (plan: Plan): FactEntry[] =>
  plan.score.pillars.flatMap((pillar) => {
    const name = `PILLAR_${toConstantName(pillar.pillar)}`
    const { points, maxPoints } = parsePillarPoints(pillar.points_shown_in_app)
    return [
      factEntry(`${name}_POINTS`, points, 'points', `${pillar.pillar}: points scored today`),
      factEntry(`${name}_MAX_POINTS`, maxPoints, 'points', `${pillar.pillar}: maximum points`),
    ]
  })

const moveAmountFacts = (move: RawTopMove): FactEntry[] =>
  dollarAmountsIn(move.action).map((amount, index) =>
    factEntry(
      `${toConstantName(move.title)}_AMOUNT${index === 0 ? '' : `_${index + 1}`}`,
      amount,
      'usd',
      `Dollar amount in the move "${move.title}": ${move.action}`,
    ),
  )

const moveFacts = (move: RawTopMove): FactEntry[] => [
  factEntry(
    `SCORE_AFTER_${toConstantName(move.title)}`,
    move.score_after,
    'points',
    `Score after the move "${move.title}" on its own`,
  ),
  ...moveAmountFacts(move),
]

const combinedMoveFacts = (plan: Plan, moveTitles: ReadonlyArray<string>): FactEntry[] =>
  plan.score.combined_moves
    .filter((combined) => combined.moves.every((title) => moveTitles.includes(title)))
    .map((combined) =>
      factEntry(
        `SCORE_AFTER_${combined.moves.map(toConstantName).join('_AND_')}`,
        combined.score_after,
        'points',
        `Score after these moves together: ${combined.moves.join(' + ')}`,
      ),
    )

/** The score today, the five pillars, and what each top move (alone or combined) does to the score. */
export const scoreFacts = (plan: Plan, maxTopMoves: number): FactEntry[] => {
  const moves = plan.score.top_moves.slice(0, maxTopMoves)
  return [
    factEntry('SCORE_NOW', plan.score.published_score, 'points', 'Financial health score today, out of 100'),
    ...pillarFacts(plan),
    ...moves.flatMap(moveFacts),
    ...combinedMoveFacts(plan, moves.map((move) => move.title)),
  ]
}
