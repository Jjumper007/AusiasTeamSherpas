import type { Plan } from '../case-schema'
import { factEntry, toConstantName, type FactEntry } from './fact-builders'

const HOME_PURCHASE_GOAL_TYPE = 'REAL_ESTATE_PURCHASE'
const CREDIT_CARD_LIABILITY_TYPE = 'PERSONAL_CREDIT_CARD'
const DOWN_PAYMENT_COST_PATTERN = /downpayment|down payment/i

/** The amount attached to each stated goal, labelled with the goal's own sentence. */
const goalAmountFacts = (plan: Plan): FactEntry[] =>
  plan.goals.goalsSummary.flatMap((goal) =>
    goal.amount === undefined
      ? []
      : [factEntry(`GOAL_${toConstantName(goal.subType ?? goal.goalType)}_AMOUNT`, goal.amount, 'usd', goal.value)],
  )

const homePurchaseFacts = (plan: Plan): FactEntry[] => {
  const purchase = plan.profile.goals.find((goal) => goal.type === HOME_PURCHASE_GOAL_TYPE)
  if (!purchase) return []
  const downPayment = purchase.yearly_costs.find((cost) => DOWN_PAYMENT_COST_PATTERN.test(cost.name))
  return [
    ...(purchase.start_year === undefined
      ? []
      : [factEntry('HOME_PURCHASE_YEAR', purchase.start_year, 'calendar_year', 'Year of the planned home purchase')]),
    ...(downPayment === undefined
      ? []
      : [factEntry('HOME_DOWN_PAYMENT', downPayment.yearly, 'usd', 'Down payment for the planned home purchase')]),
  ]
}

/** The rate on the costliest credit card that still carries a balance. */
const creditCardRateFacts = (plan: Plan): FactEntry[] => {
  const rates = plan.profile.liabilities
    .filter((liability) => liability.type === CREDIT_CARD_LIABILITY_TYPE && liability.balance > 0)
    .map((liability) => liability.interest_rate)
  if (rates.length === 0) return []
  return [
    factEntry('CREDIT_CARD_INTEREST_RATE', Math.max(...rates), 'percent', 'Yearly interest rate on the credit card'),
  ]
}

/** Goal amounts, the planned home purchase and the credit card rate, read from the plan's goals and profile. */
export const goalFacts = (plan: Plan): FactEntry[] => [
  ...goalAmountFacts(plan),
  ...homePurchaseFacts(plan),
  ...creditCardRateFacts(plan),
]
