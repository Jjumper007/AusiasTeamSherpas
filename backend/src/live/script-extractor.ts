/**
 * Reads Claude's script answer while it streams (docs/specs/live-run.md, "Script by streaming") and
 * hands over each `scenes[i]`, each `chapters[i]` and `cta` as soon as its JSON object closes, so the
 * Live run can check it and start recording its voice at once. Pure: text chunks in, parts out.
 *
 * It scans one character at a time and keeps its place between chunks, so a chunk may end anywhere:
 * inside a string, in the middle of an escape or of a key. Prose or Markdown fences before the JSON are
 * skipped (the first `{` opens it, as `extractJson` does), and so is anything after it closes.
 */

export type ScriptPartKind = 'scene' | 'chapter' | 'cta'

export interface ExtractedPart {
  readonly kind: ScriptPartKind
  /** Position in `scenes` or `chapters`; 0 for the CTA. */
  readonly index: number
  /** The part's JSON object as Claude wrote it, to be parsed and checked by the caller. */
  readonly text: string
}

export interface ScriptExtractor {
  /** Reads one more chunk and returns the parts it completed, in the order they closed. */
  readonly push: (chunk: string) => ExtractedPart[]
  /** True once the top-level object has closed: nothing more can arrive. */
  readonly closed: () => boolean
}

type PathSegment = string | number

/** An object or array still open, with where it sits in the answer. */
interface Container {
  readonly kind: 'object' | 'array'
  readonly path: readonly PathSegment[]
  /** Offset in the answer of its opening brace or bracket. */
  readonly start: number
  /** Object: the key of the value being read; array: the index of the item being read. */
  readonly key: PathSegment | null
  /** Object only: the next string is a key, not a value. */
  readonly expectsKey: boolean
}

/** Which part a closed container is, from its path in the answer; undefined for anything else. */
const partAt = (path: readonly PathSegment[]): Omit<ExtractedPart, 'text'> | undefined => {
  if (path.length === 1 && path[0] === 'cta') return { kind: 'cta', index: 0 }
  if (path.length !== 2 || typeof path[1] !== 'number') return undefined
  if (path[0] === 'scenes') return { kind: 'scene', index: path[1] }
  if (path[0] === 'chapters') return { kind: 'chapter', index: path[1] }
  return undefined
}

/** A key as JSON reads it (escapes resolved); the raw text if it is somehow not a valid string. */
const keyOf = (literal: string): string => {
  try {
    return String(JSON.parse(literal))
  } catch {
    return literal
  }
}

const opened = (kind: Container['kind'], parent: Container | undefined, start: number): Container => ({
  kind,
  path: parent ? [...parent.path, parent.key ?? ''] : [],
  start,
  key: kind === 'array' ? 0 : null,
  expectsKey: kind === 'object',
})

/** The container after a `,`: the next key of an object, or the next item of an array. */
const afterComma = (container: Container): Container =>
  container.kind === 'array'
    ? { ...container, key: Number(container.key) + 1 }
    : { ...container, key: null, expectsKey: true }

export const createScriptExtractor = (): ScriptExtractor => {
  let text = ''
  let scanned = 0
  let stack: readonly Container[] = []
  let started = false
  let done = false
  let inString = false
  let escaped = false
  let stringStart = 0

  const top = (): Container | undefined => stack.at(-1)
  const replaceTop = (container: Container): void => {
    stack = [...stack.slice(0, -1), container]
  }

  /** A string just closed at `end`: if it was a key, the container now reads that key's value. */
  const closeString = (end: number): void => {
    inString = false
    const container = top()
    if (container?.kind === 'object' && container.expectsKey) {
      replaceTop({ ...container, key: keyOf(text.slice(stringStart, end + 1)) })
    }
  }

  /** A container closed at `end`: the part it holds, if it is one. */
  const close = (end: number): ExtractedPart | undefined => {
    const container = top()
    stack = stack.slice(0, -1)
    if (stack.length === 0) done = true
    const part = container ? partAt(container.path) : undefined
    return part && container ? { ...part, text: text.slice(container.start, end + 1) } : undefined
  }

  /** Reads one character outside strings; returns the part it completed, if any. */
  const readStructure = (char: string, at: number): ExtractedPart | undefined => {
    const container = top()
    if (char === '"') {
      inString = true
      stringStart = at
    } else if (char === '{' || char === '[') {
      stack = [...stack, opened(char === '{' ? 'object' : 'array', container, at)]
    } else if (char === '}' || char === ']') {
      return close(at)
    } else if (char === ':' && container?.kind === 'object') {
      replaceTop({ ...container, expectsKey: false })
    } else if (char === ',' && container) {
      replaceTop(afterComma(container))
    }
    return undefined
  }

  const readString = (char: string, at: number): void => {
    if (escaped) escaped = false
    else if (char === '\\') escaped = true
    else if (char === '"') closeString(at)
  }

  const readChar = (char: string, at: number): ExtractedPart | undefined => {
    if (!started) {
      if (char !== '{') return undefined
      started = true
    }
    if (inString) {
      readString(char, at)
      return undefined
    }
    return readStructure(char, at)
  }

  const push = (chunk: string): ExtractedPart[] => {
    if (done) return []
    text += chunk
    const parts: ExtractedPart[] = []
    for (; scanned < text.length && !done; scanned += 1) {
      const part = readChar(text[scanned], scanned)
      if (part) parts.push(part)
    }
    return parts
  }

  return { push, closed: () => done }
}
