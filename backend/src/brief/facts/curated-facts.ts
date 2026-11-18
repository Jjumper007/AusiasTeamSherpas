import type { FactUnit } from '@sherpas/shared'
import type { Plan } from '../case-schema'
import { BriefError } from '../errors'
import { factEntry, isRecord, numberAt, toConstantName, valueAt, type FactEntry } from './fact-builders'

/**
 * `key_metrics.facts` holds the figures the plan's authors curated, each with a label and a unit.
 * This walks its sections (cash, education, retirement) and turns every figure into a fact.
 */

const CURATED_FACTS_PATH = 'facts'
const PER_YEAR_UNIT = 'USD/yr'
const PERCENT_DIVISOR = 100
const SIGNIFICANT_DIGITS = 12

const UNIT_BY_CURATED_UNIT: Readonly<Record<string, FactUnit>> = {
  USD: 'usd',
  [PER_YEAR_UNIT]: 'usd',
  months: 'months',
  percent: 'percent',
  years: 'years',
}

interface CuratedOverride {
  /** Constant name to use instead of the one derived from the path. */
  readonly name?: string
  /** Label to use when the curated one would mislead next to the bare value. */
  readonly label?: string
  /** Path in `key_metrics` holding the exact number behind a rounded display string ("49%"). */
  readonly exactPath?: string
}

const OVERRIDE_BY_CURATED_PATH: Readonly<Record<string, CuratedOverride>> = {
  'retirement.incomeShareOfNeed': {
    exactPath: 'ratios.guaranteedIncomeRatio.allIncomesVsIncomeNeededExLtcCosts',
  },
  'retirement.withdrawalRateAverage': { exactPath: 'ratios.withdrawalRateRatio.withdrawalRateAtTodaysValue' },
  'retirement.savingsLeftAtPlanEnd': { name: 'SAVINGS_LEFT_AT_PLAN_END' },
  'retirement.netCashFlowThisYear': { name: 'FREE_CASH_FLOW_PER_YEAR' },
  'retirement.savingsRunOut': {
    name: 'RETIREMENT_SPENDING_UNPAID',
    label: 'Planned retirement spending left unpaid after savings and investments run out',
  },
}

const DISPLAY_NUMBER_PATTERN = /^(-?\d+(?:\.\d+)?)(%)?$/
const MENTIONS_A_YEAR = /year|annual/i

/** Reads a curated value that may be a number or a display string ("1.4", "49%"). Percentages become fractions. */
export const parseDisplayNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value !== 'string') return undefined
  const match = DISPLAY_NUMBER_PATTERN.exec(value.replaceAll(',', '').trim())
  if (!match) return undefined
  const parsed = Number(match[1])
  const isPercentage = match[2] !== undefined
  return isPercentage ? Number((parsed / PERCENT_DIVISOR).toPrecision(SIGNIFICANT_DIGITS)) : parsed
}

const toFactUnit = (curatedUnit: unknown, path: string): FactUnit => {
  const unit = typeof curatedUnit === 'string' ? UNIT_BY_CURATED_UNIT[curatedUnit] : undefined
  if (unit === undefined) {
    throw new BriefError(`key_metrics.facts.${path} has a unit this generator does not know: ${String(curatedUnit)}`)
  }
  return unit
}

const labelFor = (node: Record<string, unknown>, override: CuratedOverride): string => {
  const label = override.label ?? String(node.label)
  const isPerYear = node.unit === PER_YEAR_UNIT
  return isPerYear && !MENTIONS_A_YEAR.test(label) ? `${label}, per year` : label
}

/** Facts for one curated figure: a single value, or a min/max range. */
const nodeFacts = (keyMetrics: unknown, node: Record<string, unknown>, path: string, baseName: string): FactEntry[] => {
  const override = OVERRIDE_BY_CURATED_PATH[path] ?? {}
  const unit = toFactUnit(node.unit, path)
  const name = override.name ?? `${baseName}${node.unit === PER_YEAR_UNIT ? '_PER_YEAR' : ''}`
  const label = labelFor(node, override)
  const exact = override.exactPath === undefined ? undefined : numberAt(keyMetrics, override.exactPath)

  const candidates: ReadonlyArray<readonly [string, string, number | undefined]> = [
    [name, label, exact ?? parseDisplayNumber(node.value)],
    [`${name}_MIN`, `${label}: lower end`, parseDisplayNumber(node.min)],
    [`${name}_MAX`, `${label}: upper end`, parseDisplayNumber(node.max)],
  ]
  return candidates.flatMap(([factName, factLabel, value]) =>
    value === undefined ? [] : [factEntry(factName, value, unit, factLabel)],
  )
}

const isCuratedNode = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) && typeof value.label === 'string'

/** A list item is named after the start of its label: "College Oliver: total cost" → COLLEGE_OLIVER. */
const listItemName = (node: Record<string, unknown>): string => toConstantName(String(node.label).split(':')[0])

const entryFacts = (keyMetrics: unknown, section: string, key: string, value: unknown): FactEntry[] => {
  const path = `${section}.${key}`
  const baseName = `${toConstantName(section)}_${toConstantName(key)}`
  if (isCuratedNode(value)) return nodeFacts(keyMetrics, value, path, baseName)
  if (!Array.isArray(value)) return []
  return value
    .filter(isCuratedNode)
    .flatMap((node) => nodeFacts(keyMetrics, node, path, `${baseName}_${listItemName(node)}`))
}

/** Every curated figure in `key_metrics.facts`, with exact values where the plan only shows a rounded string. */
export const curatedFacts = (plan: Plan): FactEntry[] => {
  const sections = valueAt(plan.key_metrics, CURATED_FACTS_PATH)
  if (!isRecord(sections)) return []
  return Object.entries(sections)
    .filter((section): section is [string, Record<string, unknown>] => isRecord(section[1]))
    .flatMap(([section, entries]) =>
      Object.entries(entries).flatMap(([key, value]) => entryFacts(plan.key_metrics, section, key, value)),
    )
}
