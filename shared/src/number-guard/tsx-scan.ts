import { isStructuralName } from './tsx-structural'

/**
 * A small, dependency-free TSX scanner (no TypeScript parser, so it also runs in the browser bundle).
 * It does not build a syntax tree: it only finds the places where a figure can reach the screen.
 *
 * - `jsxText`: text between JSX tags.
 * - `string`: the contents of a string literal or of a static chunk of a template literal,
 *   unless it belongs to a structural name (see `tsx-structural.ts`) or to an import.
 * - `literal`: a numeric literal passed to `fmt.*(...)`, or one that is the whole JSX child (`{1500000}`).
 *
 * Every other numeric literal (props, style, arithmetic, constants) and all comments are structural.
 * The scanner never throws: on malformed source it returns what it found so far.
 */
export type RegionKind = 'jsxText' | 'string' | 'literal'

export interface Region {
  readonly kind: RegionKind
  readonly start: number
  readonly end: number
}

interface Scan {
  readonly regions: readonly Region[]
  readonly next: number
}

interface Scope {
  /** The character that ends this stretch of code, or `null` at the top level. */
  readonly closer: string | null
  readonly checkStrings: boolean
  readonly checkLiterals: boolean
}

interface CodeState {
  readonly pos: number
  readonly regions: readonly Region[]
  /** The name the current value is being assigned to: `fontWeight` in `fontWeight: '700'`. */
  readonly owner: string | null
  readonly lastName: string | null
  /** Whether the previous token ends a value, which tells `a < b` and `a / b` from JSX and regex. */
  readonly prevIsValue: boolean
}

const GROUP_CLOSERS: Readonly<Record<string, string>> = { '{': '}', '(': ')', '[': ']' }
const VALUE_ENDING_PUNCTUATION: readonly string[] = [')', ']']
const MODULE_KEYWORDS: ReadonlySet<string> = new Set(['import', 'from', 'require'])
const DECLARATION_KEYWORDS: ReadonlySet<string> = new Set([
  'const', 'let', 'var', 'function', 'class', 'export', 'type', 'interface', 'return',
])
/** Keywords after which `<` opens JSX and `/` opens a regex. */
const NON_VALUE_KEYWORDS: ReadonlySet<string> = new Set([
  ...DECLARATION_KEYWORDS, 'yield', 'default', 'case', 'else', 'await', 'typeof', 'in', 'of',
])
const TOP_LEVEL: Scope = { closer: null, checkStrings: true, checkLiterals: false }

const WHITESPACE = /\s/
const DIGIT = /\d/
const NAME_START = /[A-Za-z_$]/
const NAME_PART = /[\w$]/
const NUMBER_PART = /[\w.]/
const JSX_NAME_PART = /[\w$.:-]/
const JSX_START = /[A-Za-z_$>]/
/** What separates `import` / `from` / `require` from the module path they are followed by. */
const MODULE_PATH_LEAD = /\s*\(?\s*(?=['"])/y
const FMT_CALL = /\s*\.\s*[A-Za-z_$][\w$]*\s*\(/y
const SOLE_NUMBER_CHILD = /\{\s*(\d[\w.]*)\s*\}/y

const readWhile = (src: string, start: number, allowed: RegExp): number => {
  let pos = start
  while (pos < src.length && allowed.test(src.charAt(pos))) pos += 1
  return pos
}

const indexOrEnd = (src: string, search: string, from: number): number => {
  const found = src.indexOf(search, from)
  return found === -1 ? src.length : found
}

const matchAt = (src: string, pattern: RegExp, pos: number): RegExpExecArray | null => {
  const sticky = new RegExp(pattern.source, pattern.flags)
  sticky.lastIndex = pos
  return sticky.exec(src)
}

const region = (kind: RegionKind, start: number, end: number, checked: boolean): readonly Region[] =>
  checked && end > start ? [{ kind, start, end }] : []

/** Index of the closing quote of a JS string, or of the line end when it is unterminated. */
const closingQuote = (src: string, start: number): number => {
  const quote = src.charAt(start)
  let pos = start + 1
  while (pos < src.length && src.charAt(pos) !== quote && src.charAt(pos) !== '\n') {
    pos += src.charAt(pos) === '\\' ? 2 : 1
  }
  return Math.min(pos, src.length)
}

const closingRegexSlash = (src: string, start: number): number => {
  let pos = start + 1
  let inClass = false
  while (pos < src.length && src.charAt(pos) !== '\n') {
    const ch = src.charAt(pos)
    if (ch === '/' && !inClass) return pos
    if (ch === '[') inClass = true
    if (ch === ']') inClass = false
    pos += ch === '\\' ? 2 : 1
  }
  return Math.min(pos, src.length)
}

function scanTemplate(src: string, start: number, checked: boolean): Scan {
  let pos = start
  let chunkStart = start
  let regions: readonly Region[] = []
  while (pos < src.length && src.charAt(pos) !== '`') {
    if (src.startsWith('${', pos)) {
      const scope: Scope = { closer: '}', checkStrings: checked, checkLiterals: false }
      const inner = scanCode(src, pos + 2, scope)
      regions = [...regions, ...region('string', chunkStart, pos, checked), ...inner.regions]
      pos = inner.next
      chunkStart = pos
    } else {
      pos += src.charAt(pos) === '\\' ? 2 : 1
    }
  }
  const end = Math.min(pos, src.length)
  return { regions: [...regions, ...region('string', chunkStart, end, checked)], next: end + 1 }
}

function scanJsxAttributeValue(src: string, nameEnd: number, name: string): Scan {
  const equals = readWhile(src, nameEnd, WHITESPACE)
  if (src.charAt(equals) !== '=') return { regions: [], next: nameEnd }

  const valueStart = readWhile(src, equals + 1, WHITESPACE)
  const opener = src.charAt(valueStart)
  const checked = !isStructuralName(name)
  if (opener === '"' || opener === "'") {
    const close = indexOrEnd(src, opener, valueStart + 1)
    return { regions: region('string', valueStart + 1, close, checked), next: close + 1 }
  }
  if (opener === '{') {
    return scanCode(src, valueStart + 1, { closer: '}', checkStrings: checked, checkLiterals: false })
  }
  return { regions: [], next: valueStart }
}

function scanJsxAttributes(src: string, start: number): Scan & { readonly selfClosing: boolean } {
  let pos = start
  let regions: readonly Region[] = []
  while (pos < src.length) {
    if (src.charAt(pos) === '>') return { regions, next: pos + 1, selfClosing: false }
    if (src.startsWith('/>', pos)) return { regions, next: pos + 2, selfClosing: true }

    const nameEnd = readWhile(src, pos, JSX_NAME_PART)
    const found =
      src.charAt(pos) === '{'
        ? scanCode(src, pos + 1, { ...TOP_LEVEL, closer: '}' })
        : nameEnd === pos
          ? { regions: [], next: pos + 1 }
          : scanJsxAttributeValue(src, nameEnd, src.slice(pos, nameEnd))
    regions = [...regions, ...found.regions]
    pos = found.next
  }
  return { regions, next: src.length, selfClosing: true }
}

function scanJsxChildExpression(src: string, start: number): Scan {
  const soleNumber = matchAt(src, SOLE_NUMBER_CHILD, start)
  const literal = soleNumber?.[1]
  if (soleNumber === null || literal === undefined) {
    return scanCode(src, start + 1, { ...TOP_LEVEL, closer: '}' })
  }
  const literalStart = start + soleNumber[0].indexOf(literal)
  return {
    regions: region('literal', literalStart, literalStart + literal.length, true),
    next: start + soleNumber[0].length,
  }
}

function scanJsxChildren(src: string, start: number): Scan {
  let pos = start
  let regions: readonly Region[] = []
  while (pos < src.length) {
    if (src.startsWith('</', pos)) return { regions, next: indexOrEnd(src, '>', pos) + 1 }

    const ch = src.charAt(pos)
    const textEnd = Math.min(indexOrEnd(src, '<', pos), indexOrEnd(src, '{', pos))
    const found =
      ch === '{'
        ? scanJsxChildExpression(src, pos)
        : ch === '<'
          ? scanJsxElement(src, pos)
          : { regions: region('jsxText', pos, textEnd, true), next: textEnd }
    regions = [...regions, ...found.regions]
    pos = found.next
  }
  return { regions, next: src.length }
}

/** Scans one element starting at its `<`. Displayed content is always checked, whatever surrounds it. */
function scanJsxElement(src: string, start: number): Scan {
  const nameEnd = readWhile(src, start + 1, JSX_NAME_PART)
  const attributes = scanJsxAttributes(src, nameEnd)
  if (attributes.selfClosing) return attributes

  const children = scanJsxChildren(src, attributes.next)
  return { regions: [...attributes.regions, ...children.regions], next: children.next }
}

const stepString = (src: string, state: CodeState, scope: Scope): CodeState => {
  const close = closingQuote(src, state.pos)
  const checked = scope.checkStrings && !isStructuralName(state.owner)
  return {
    ...state,
    pos: close + 1,
    regions: [...state.regions, ...region('string', state.pos + 1, close, checked)],
    lastName: src.slice(state.pos + 1, close),
    prevIsValue: true,
  }
}

const stepTemplate = (src: string, state: CodeState, scope: Scope): CodeState => {
  const checked = scope.checkStrings && !isStructuralName(state.owner)
  const template = scanTemplate(src, state.pos + 1, checked)
  return {
    ...state,
    pos: template.next,
    regions: [...state.regions, ...template.regions],
    prevIsValue: true,
  }
}

const stepNumber = (src: string, state: CodeState, scope: Scope): CodeState => {
  const end = readWhile(src, state.pos, NUMBER_PART)
  return {
    ...state,
    pos: end,
    regions: [...state.regions, ...region('literal', state.pos, end, scope.checkLiterals)],
    prevIsValue: true,
  }
}

const stepName = (src: string, state: CodeState, scope: Scope): CodeState => {
  const end = readWhile(src, state.pos, NAME_PART)
  const name = src.slice(state.pos, end)
  const fmtCall = name === 'fmt' ? matchAt(src, FMT_CALL, end) : null
  if (fmtCall !== null) {
    const args = scanCode(src, end + fmtCall[0].length, { ...scope, closer: ')', checkLiterals: true })
    return { ...state, pos: args.next, regions: [...state.regions, ...args.regions], prevIsValue: true }
  }
  const modulePath = MODULE_KEYWORDS.has(name) ? matchAt(src, MODULE_PATH_LEAD, end) : null
  if (modulePath !== null) {
    return { ...state, pos: closingQuote(src, end + modulePath[0].length) + 1, prevIsValue: true }
  }
  return {
    ...state,
    pos: end,
    lastName: name,
    owner: DECLARATION_KEYWORDS.has(name) ? null : state.owner,
    prevIsValue: !NON_VALUE_KEYWORDS.has(name),
  }
}

const stepGroup = (src: string, state: CodeState, scope: Scope): CodeState => {
  const opener = src.charAt(state.pos)
  const inner = scanCode(src, state.pos + 1, {
    closer: GROUP_CLOSERS[opener] ?? null,
    checkStrings: scope.checkStrings && !isStructuralName(state.owner),
    checkLiterals: scope.checkLiterals,
  })
  return {
    ...state,
    pos: inner.next,
    regions: [...state.regions, ...inner.regions],
    prevIsValue: opener !== '{',
  }
}

const stepJsx = (src: string, state: CodeState): CodeState => {
  const element = scanJsxElement(src, state.pos)
  return {
    ...state,
    pos: element.next,
    regions: [...state.regions, ...element.regions],
    prevIsValue: true,
  }
}

const stepPunctuation = (src: string, state: CodeState): CodeState => {
  const ch = src.charAt(state.pos)
  const next = { ...state, pos: state.pos + 1, prevIsValue: VALUE_ENDING_PUNCTUATION.includes(ch) }
  const isComparisonOrArrow = ch === '=' && /[=>]/.test(src.charAt(state.pos + 1))
  if (isComparisonOrArrow) return { ...next, pos: readWhile(src, state.pos, /[=>]/) }
  if (ch === '=') return { ...next, owner: state.lastName }
  if (ch === ':') return { ...next, owner: state.owner ?? state.lastName }
  if (ch === ',' || ch === ';') return { ...next, owner: null }
  return next
}

const stepCode = (src: string, state: CodeState, scope: Scope): CodeState => {
  const ch = src.charAt(state.pos)
  if (WHITESPACE.test(ch)) return { ...state, pos: state.pos + 1 }
  if (src.startsWith('//', state.pos)) return { ...state, pos: indexOrEnd(src, '\n', state.pos) }
  if (src.startsWith('/*', state.pos)) return { ...state, pos: indexOrEnd(src, '*/', state.pos) + 2 }
  if (ch === '"' || ch === "'") return stepString(src, state, scope)
  if (ch === '`') return stepTemplate(src, state, scope)
  if (DIGIT.test(ch)) return stepNumber(src, state, scope)
  if (NAME_START.test(ch)) return stepName(src, state, scope)
  if (ch in GROUP_CLOSERS) return stepGroup(src, state, scope)
  if (state.prevIsValue) return stepPunctuation(src, state)
  if (ch === '<' && JSX_START.test(src.charAt(state.pos + 1))) return stepJsx(src, state)
  if (ch === '/') return { ...state, pos: closingRegexSlash(src, state.pos) + 1, prevIsValue: true }
  return stepPunctuation(src, state)
}

function scanCode(src: string, start: number, scope: Scope): Scan {
  let state: CodeState = {
    pos: start,
    regions: [],
    owner: null,
    lastName: null,
    prevIsValue: false,
  }
  while (state.pos < src.length) {
    if (src.charAt(state.pos) === scope.closer) return { regions: state.regions, next: state.pos + 1 }
    state = stepCode(src, state, scope)
  }
  return { regions: state.regions, next: src.length }
}

/** Finds every place in a TSX source where a figure can reach the screen. */
export const scanTsx = (source: string): readonly Region[] => scanCode(source, 0, TOP_LEVEL).regions
