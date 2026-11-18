import type { Fact, FactUnit } from '@sherpas/shared'

/** A fact with the constant name it will be exported under. */
export type FactEntry = readonly [name: string, fact: Fact]

/** A figure read from one dotted path inside `key_metrics`. */
export interface PathFactSpec {
  readonly name: string
  readonly path: string
  readonly unit: FactUnit
  readonly label: string
  /** Leave the fact out when the value is 0, because 0 here means "the case does not have this". */
  readonly skipZero?: boolean
}

const APOSTROPHES = /['’]/g
const CAMEL_CASE_BOUNDARY = /([a-z0-9])([A-Z])/g
const NON_ALPHANUMERIC_RUN = /[^A-Za-z0-9]+/g
const EDGE_UNDERSCORES = /^_+|_+$/g

/** Builds a SCREAMING_SNAKE_CASE name from free text ("Add umbrella cover") or camelCase ("fundingGap"). */
export const toConstantName = (text: string): string =>
  text
    .replace(APOSTROPHES, '')
    .replace(CAMEL_CASE_BOUNDARY, '$1_$2')
    .replace(NON_ALPHANUMERIC_RUN, '_')
    .replace(EDGE_UNDERSCORES, '')
    .toUpperCase()

export const factEntry = (name: string, value: number, unit: FactUnit, label: string): FactEntry => [
  name,
  { value, unit, label },
]

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Reads the value at a dotted path, or `undefined` when any step is missing. */
export const valueAt = (root: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((node, key) => (isRecord(node) ? node[key] : undefined), root)

/**
 * Reads a number at a dotted path. Returns `undefined` when it is missing or not a number:
 * the plan writes "Not applicable" where a figure does not exist for the case.
 */
export const numberAt = (root: unknown, path: string): number | undefined => {
  const value = valueAt(root, path)
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/** Builds the facts whose figure exists in `root`, skipping the ones the case does not have. */
export const factsFromPaths = (root: unknown, specs: ReadonlyArray<PathFactSpec>): FactEntry[] =>
  specs.flatMap((spec) => {
    const value = numberAt(root, spec.path)
    if (value === undefined || (spec.skipZero && value === 0)) return []
    return [factEntry(spec.name, value, spec.unit, spec.label)]
  })

export { isRecord }
