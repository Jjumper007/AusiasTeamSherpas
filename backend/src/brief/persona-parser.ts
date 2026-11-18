import type { Classification, Concern, Tension } from '@sherpas/shared'
import { BriefError } from './errors'

/** What the brief takes from `persona.md`. */
export interface Persona {
  readonly classification: Classification
  readonly concerns: Concern[]
  readonly tensions: Tension[]
}

const CLASSIFICATION_KEYS = ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6'] as const

const CLASSIFICATION_BLOCK_PATTERN = /```classification\n([\s\S]*?)```/
const CLASSIFICATION_LINE_PATTERN = /^(D\d): *(.+)$/

const CONCERN_LINE_START = /^- \*\*O\d+/
const TENSION_LINE_START = /^- \*\*T\d+/

/**
 * Two layouts exist across the persona files:
 *   - **O1: Retirement (SIGNIFICANT).** text
 *   - **O1 SIGNIFICANT: Retirement shortfall.** text
 */
const CONCERN_PATTERN = /^- \*\*(O\d+)(?: ([A-Z]+))?: *(.+?)(?: \(([A-Z]+)\))?\.\*\* *(.+)$/

/**
 * Two layouts exist across the persona files:
 *   - **T1 (HIGH):** text
 *   - **T1: Title (HIGH).** text
 */
const TENSION_PATTERN = /^- \*\*(T\d+)(?:: *(.+?))? *\(([A-Z]+)\)[:.]\*\* *(.+)$/

/** Trailing cross-reference such as "Connected: D3, D4c." It repeats ids and is dropped to keep the brief small. */
const CONNECTED_SUFFIX_PATTERN = / *Connected: [^.]*\.$/

const parseClassification = (markdown: string): Classification => {
  const block = CLASSIFICATION_BLOCK_PATTERN.exec(markdown)?.[1]
  if (block === undefined) throw new BriefError('persona.md has no ```classification block')

  const entries = block
    .split('\n')
    .map((line) => CLASSIFICATION_LINE_PATTERN.exec(line.trim()))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => [match[1], match[2].trim()] as const)
  const values = new Map(entries)

  const missing = CLASSIFICATION_KEYS.filter((key) => !values.has(key))
  if (missing.length > 0) {
    throw new BriefError(`persona.md classification block is missing ${missing.join(', ')}`)
  }
  const valueOf = (key: (typeof CLASSIFICATION_KEYS)[number]): string => values.get(key) ?? ''
  return {
    D0: valueOf('D0'),
    D1: valueOf('D1'),
    D2: valueOf('D2'),
    D3: valueOf('D3'),
    D4: valueOf('D4'),
    D5: valueOf('D5'),
    D6: valueOf('D6'),
  }
}

const parseConcern = (line: string): Concern => {
  const match = CONCERN_PATTERN.exec(line)
  const severity = match?.[2] ?? match?.[4]
  if (!match || severity === undefined) {
    throw new BriefError(`persona.md concern is not in a known format: "${line.slice(0, 60)}"`)
  }
  return {
    id: match[1],
    title: match[3].trim(),
    severity,
    text: match[5].replace(CONNECTED_SUFFIX_PATTERN, '').trim(),
  }
}

const parseTension = (line: string): Tension => {
  const match = TENSION_PATTERN.exec(line)
  if (!match) {
    throw new BriefError(`persona.md tension is not in a known format: "${line.slice(0, 60)}"`)
  }
  const title = match[2]?.trim()
  const text = match[4].trim()
  return { id: match[1], level: match[3], text: title ? `${title}. ${text}` : text }
}

const linesStartingWith = (markdown: string, start: RegExp): string[] =>
  markdown
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => start.test(line))

/** Reads the classification block (D0–D6), the objective concerns and the tensions from a `persona.md`. */
export const parsePersona = (markdown: string): Persona => ({
  classification: parseClassification(markdown),
  concerns: linesStartingWith(markdown, CONCERN_LINE_START).map(parseConcern),
  tensions: linesStartingWith(markdown, TENSION_LINE_START).map(parseTension),
})
