import type { Plan, RawPerson } from '../case-schema'
import { factEntry, factsFromPaths, toConstantName, type FactEntry, type PathFactSpec } from './fact-builders'

const RETIREMENT_GOAL_TYPE = 'RETIREMENT'

const TIMELINE_SPECS: ReadonlyArray<PathFactSpec> = [
  {
    name: 'YEARS_TO_RETIREMENT',
    path: 'ratios.retirementSavings.yearsToRetirement',
    unit: 'years',
    label: 'Years until retirement',
  },
  {
    name: 'PLAN_END_AGE',
    path: 'retirementAndOtherGoals.clientProfile.endOfPlanAge',
    unit: 'years',
    label: 'Age the plan runs to',
  },
  {
    name: 'SAVINGS_RUN_OUT_AGE',
    path: 'retirementAndOtherGoals.assetDepletion.ageWhenTheyRunOutOfLiquidAssets',
    unit: 'years',
    label: 'Age at which savings and investments run out',
  },
]

const personFacts = (person: RawPerson): FactEntry[] => {
  const name = toConstantName(person.first_name)
  const age = factEntry(`${name}_AGE`, person.age, 'years', `${person.first_name}'s age today`)
  if (person.retirement_age === undefined) return [age]
  return [
    age,
    factEntry(
      `${name}_RETIREMENT_AGE`,
      person.retirement_age,
      'years',
      `Age at which ${person.first_name} retires`,
    ),
  ]
}

const retirementYearFacts = (plan: Plan): FactEntry[] => {
  const years = plan.goals.chartGoals
    .filter((goal) => goal.goalType === RETIREMENT_GOAL_TYPE)
    .map((goal) => new Date(goal.date).getUTCFullYear())
    .filter((year) => Number.isFinite(year))
  if (years.length === 0) return []
  return [factEntry('RETIREMENT_YEAR', Math.min(...years), 'calendar_year', 'Year retirement starts')]
}

/** Ages, retirement ages and the plan's timeline. */
export const householdFacts = (plan: Plan): FactEntry[] => [
  ...plan.case.household.flatMap(personFacts),
  ...retirementYearFacts(plan),
  ...factsFromPaths(plan.key_metrics, TIMELINE_SPECS),
]
