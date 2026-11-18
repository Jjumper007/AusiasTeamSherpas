import { findNearestFact, type AcceptedFact } from './accepted'
import type { NumberToken } from './tokens'
import type { NearestFact, NumberGuardError } from './types'

/** Characters of context kept on each side of the number in a snippet. */
const SNIPPET_RADIUS = 40
const ELLIPSIS = '…'
const LINE_BREAK = '\n'

interface Position {
  readonly line: number
  readonly column: number
  readonly lineText: string
}

const locate = (source: string, offset: number): Position => {
  const before = source.slice(0, offset)
  const lineStart = before.lastIndexOf(LINE_BREAK) + 1
  const nextBreak = source.indexOf(LINE_BREAK, offset)
  return {
    line: before.split(LINE_BREAK).length,
    column: offset - lineStart + 1,
    lineText: source.slice(lineStart, nextBreak === -1 ? source.length : nextBreak),
  }
}

const snippetAround = (position: Position, length: number): string => {
  const { lineText, column } = position
  const from = Math.max(0, column - 1 - SNIPPET_RADIUS)
  const to = Math.min(lineText.length, column - 1 + length + SNIPPET_RADIUS)
  const prefix = from > 0 ? ELLIPSIS : ''
  const suffix = to < lineText.length ? ELLIPSIS : ''
  return `${prefix}${lineText.slice(from, to).trim()}${suffix}`
}

const quoteAll = (forms: readonly string[]): string =>
  forms.map((form) => `"${form}"`).join(' or ')

const expectation = (nearest: NearestFact | null): string =>
  nearest === null
    ? 'There are no facts to take it from.'
    : `Nearest fact: ${nearest.name} = ${String(nearest.value)} (${nearest.unit}). ` +
      `Write it as ${quoteAll(nearest.acceptedForms)}.`

/** Builds the error for a number that is not in facts: which number, where, and what was expected. */
export const toError = (
  source: string,
  token: NumberToken,
  accepted: readonly AcceptedFact[],
): NumberGuardError => {
  const position = locate(source, token.start)
  const nearestFact = findNearestFact(token.value, accepted)
  const snippet = snippetAround(position, token.raw.length)
  return {
    number: token.raw,
    value: token.value,
    line: position.line,
    column: position.column,
    snippet,
    nearestFact,
    message:
      `Number "${token.raw}" at line ${String(position.line)}, column ${String(position.column)} ` +
      `does not come from facts. ${expectation(nearestFact)} Context: "${snippet}"`,
  }
}
