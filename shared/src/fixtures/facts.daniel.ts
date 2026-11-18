import type { Facts } from '../facts'

/** Sample facts for Daniel (case `daniel-emily-johnson`). Values are exact, as in the case JSON. */
export const factsFixture = {
  SCORE_NOW: { value: 52, unit: 'points', label: 'Financial health score today, out of 100' },
  SCORE_AFTER_LIFE_COVER: {
    value: 57,
    unit: 'points',
    label: 'Score after raising life cover',
  },
  SCORE_AFTER_UMBRELLA: { value: 56, unit: 'points', label: 'Score after adding umbrella cover' },
  SCORE_AFTER_SAVINGS: { value: 55, unit: 'points', label: 'Score after raising annual savings' },
  SCORE_AFTER_LIFE_AND_UMBRELLA: {
    value: 60,
    unit: 'points',
    label: 'Score after raising life cover and adding umbrella cover together',
  },
  LIFE_COVER_TO_ADD: {
    value: 1166000,
    unit: 'usd',
    label: 'Life cover to add to reach the next coverage level',
  },
  DANIEL_LIFE_COVER: { value: 250000, unit: 'usd', label: "Daniel's life cover today" },
  DANIEL_LIFE_COVER_RECOMMENDED_MIN: {
    value: 1600000,
    unit: 'usd',
    label: "Lower end of Daniel's recommended life cover",
  },
  UMBRELLA_COVER_RECOMMENDED: {
    value: 1000000,
    unit: 'usd',
    label: 'Recommended minimum umbrella cover',
  },
  RETIREMENT_GAP: {
    value: 1427455.89,
    unit: 'usd',
    label: "Retirement gap in today's dollars",
  },
  RETIREMENT_EXTRA_SAVING_PER_YEAR: {
    value: 34164.77,
    unit: 'usd',
    label: 'Extra yearly saving needed to close the retirement gap',
  },
  RETIREMENT_SPENDING_NEED_PER_YEAR: {
    value: 124070.59,
    unit: 'usd',
    label: "Yearly spending need in retirement, in today's dollars",
  },
  RETIREMENT_INCOME_SHARE_OF_NEED: {
    value: 0.4928,
    unit: 'percent',
    label: 'Share of the yearly retirement spending need that income covers',
  },
  SAVINGS_LEFT_AT_PLAN_END: {
    value: 260272.08,
    unit: 'usd',
    label: "Savings left at the end of the plan, in today's dollars",
  },
  FREE_CASH_FLOW_PER_YEAR: {
    value: 15032.01,
    unit: 'usd',
    label: 'Money left over each year after all outflows',
  },
  RETIREMENT_YEAR: { value: 2044, unit: 'calendar_year', label: 'Year Daniel and Emily retire' },
  YEARS_TO_RETIREMENT: { value: 17, unit: 'years', label: 'Years until retirement' },
  DANIEL_RETIREMENT_AGE: { value: 62, unit: 'years', label: 'Age at which Daniel retires' },
  PLAN_END_AGE: { value: 91, unit: 'years', label: 'Age the plan runs to' },
} satisfies Facts
