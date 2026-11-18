import type { Plan, RawPerson } from '../case-schema'
import { factsFromPaths, toConstantName, type FactEntry, type PathFactSpec } from './fact-builders'

/** Figures read straight from `key_metrics.ratios` and the statements: protection, retirement gap, cash, debt. */

const LIFE = 'ratios.lifeInsurance'

/** `key` is how the plan names the person in its field names: "client" / "Client" or "coClient" / "CoClient". */
const lifeCoverSpecs = (person: RawPerson, key: string, capitalisedKey: string): PathFactSpec[] => {
  const name = toConstantName(person.first_name)
  const who = person.first_name
  return [
    { name: `${name}_LIFE_COVER`, path: `${LIFE}.${key}Coverage`, unit: 'usd', label: `${who}'s life cover today` },
    {
      name: `${name}_LIFE_COVER_RECOMMENDED_MIN`,
      path: `${LIFE}.recommended${capitalisedKey}MinCoverage`,
      unit: 'usd',
      label: `Lower end of ${who}'s recommended life cover`,
    },
    {
      name: `${name}_LIFE_COVER_RECOMMENDED_MAX`,
      path: `${LIFE}.recommended${capitalisedKey}MaxCoverage`,
      unit: 'usd',
      label: `Upper end of ${who}'s recommended life cover`,
    },
    {
      name: `${name}_LIFE_COVER_SHORTFALL`,
      path: `${LIFE}.lifeInsuranceCoverageGapsAndExcess.${key}Shortfall`,
      unit: 'usd',
      label: `How far ${who}'s life cover is below the lower end of the recommended range`,
      skipZero: true,
    },
  ]
}

const PROTECTION_AND_RETIREMENT_SPECS: ReadonlyArray<PathFactSpec> = [
  { name: 'UMBRELLA_COVER', path: 'ratios.umbrella.currentCoverage', unit: 'usd', label: 'Umbrella cover today' },
  {
    name: 'UMBRELLA_COVER_RECOMMENDED',
    path: 'ratios.umbrella.recommendedCoverage',
    unit: 'usd',
    label: 'Recommended minimum umbrella cover',
  },
  {
    name: 'RETIREMENT_GAP',
    path: 'ratios.retirementSavings.planningGapAtRetirementAgeInTodaysDollars',
    unit: 'usd',
    label: "Retirement gap in today's dollars",
    skipZero: true,
  },
  {
    name: 'RETIREMENT_EXTRA_SAVING_PER_YEAR',
    path: 'ratios.retirementSavings.requiredExtraSavings',
    unit: 'usd',
    label: 'Extra yearly saving needed to close the retirement gap',
    skipZero: true,
  },
]

const CASH_AND_WEALTH_SPECS: ReadonlyArray<PathFactSpec> = [
  {
    name: 'CASH_GAP_TO_TARGET',
    path: 'ratios.emergencyFund.shortfallToAdjustedMin',
    unit: 'usd',
    label: 'Cash still needed to reach the lower end of the cash target (emergency reserve plus near-term goals)',
  },
  {
    name: 'EMERGENCY_RESERVE_GAP',
    path: 'ratios.emergencyFund.shortfallToBaseMin',
    unit: 'usd',
    label: 'Cash still needed to reach the lower end of the emergency reserve',
  },
  {
    name: 'EMERGENCY_RESERVE_MONTHS_RECOMMENDED_MIN',
    path: 'ratios.emergencyFund.minRecommendedEFMonths',
    unit: 'months',
    label: 'Lower end of the recommended emergency reserve, in months of essential expenses',
  },
  {
    name: 'EMERGENCY_RESERVE_MONTHS_RECOMMENDED_MAX',
    path: 'ratios.emergencyFund.maxRecommendedEFMonths',
    unit: 'months',
    label: 'Upper end of the recommended emergency reserve, in months of essential expenses',
  },
  { name: 'NET_WORTH', path: 'netWorthStatement.netWorth.total', unit: 'usd', label: 'Net worth today' },
  {
    name: 'GROSS_INCOME_PER_YEAR',
    path: 'ratios.debtToIncome.grossIncome',
    unit: 'usd',
    label: 'Household gross income per year',
  },
  {
    name: 'INVESTABLE_ASSETS',
    path: 'ratios.investableAssetLevel.investableAssets',
    unit: 'usd',
    label: 'Investable assets today',
  },
  {
    name: 'SAVINGS_PER_YEAR',
    path: 'ratios.savingsLevel.savingAmount',
    unit: 'usd',
    label: 'Amount saved per year today',
  },
  {
    name: 'SAVINGS_RATE',
    path: 'ratios.savingsLevel.ratio',
    unit: 'percent',
    label: 'Share of gross income saved each year',
  },
  {
    name: 'COLLEGE_529_BALANCE',
    path: 'ratios.educationSavings.current529AccountsBalance',
    unit: 'usd',
    label: 'Balance in 529 college accounts today',
    skipZero: true,
  },
  {
    name: 'COLLEGE_529_SAVING_PER_YEAR',
    path: 'ratios.educationSavings.annualSavingsGoingTo529Accounts',
    unit: 'usd',
    label: 'Amount going into 529 college accounts per year',
    skipZero: true,
  },
]

const DEBT_SPECS: ReadonlyArray<PathFactSpec> = [
  { name: 'TOTAL_DEBT', path: 'ratios.indebtedness.debtBalance', unit: 'usd', label: 'Total debt today', skipZero: true },
  {
    name: 'DEBT_PAYMENTS_PER_MONTH',
    path: 'ratios.indebtedness.monthlyDebtPayment',
    unit: 'usd',
    label: 'Debt payments per month',
    skipZero: true,
  },
  {
    name: 'DEBT_TO_INCOME',
    path: 'ratios.debtToIncome.debtOnlyDti',
    unit: 'percent',
    label: 'Share of gross income that goes to debt payments',
    skipZero: true,
  },
  {
    name: 'HOUSING_AND_DEBT_TO_INCOME',
    path: 'ratios.debtToIncome.ratio',
    unit: 'percent',
    label: 'Share of gross income that goes to housing and debt payments together',
  },
  {
    name: 'CREDIT_CARD_BALANCE',
    path: 'ratios.creditCardDebt.balance',
    unit: 'usd',
    label: 'Credit card balance today',
    skipZero: true,
  },
  {
    name: 'CREDIT_CARD_PAYMENT_PER_MONTH',
    path: 'ratios.creditCardDebt.monthlyPayment',
    unit: 'usd',
    label: 'Credit card payment per month',
    skipZero: true,
  },
]

const lifeCoverFacts = (plan: Plan): PathFactSpec[] => {
  const client = plan.case.household.find((person) => person.role === 'client')
  const coClient = plan.case.household.find((person) => person.role === 'co-client')
  return [
    ...(client ? lifeCoverSpecs(client, 'client', 'Client') : []),
    ...(coClient ? lifeCoverSpecs(coClient, 'coClient', 'CoClient') : []),
  ]
}

export const planFacts = (plan: Plan): FactEntry[] =>
  factsFromPaths(plan.key_metrics, [
    ...lifeCoverFacts(plan),
    ...PROTECTION_AND_RETIREMENT_SPECS,
    ...CASH_AND_WEALTH_SPECS,
    ...DEBT_SPECS,
  ])
