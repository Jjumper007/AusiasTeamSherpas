/**
 * The scene file inside Claude's answer (#15). The prompt asks for the file's content only, but an
 * answer wrapped in a Markdown fence, or with a line of prose before or after the code, is read too.
 * An empty answer, or one that is clearly not a TSX module, is refused with a short reason.
 */

export type SceneAnswer = { readonly ok: true; readonly source: string } | { readonly ok: false; readonly reason: string }

/** A fenced block: ```tsx … ``` (any language tag, or none). */
const FENCED_BLOCK = /```[\w-]*[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*```/g
/** Where TSX code starts: an import, an export, a declaration or a comment. */
const CODE_START = /^\s*(import\b|export\b|const\b|type\b|interface\b|function\b|\/\/|\/\*)/
/** A sentence after the code: a capital letter first, and none of the characters code is made of. */
const PROSE_LINE = /^[A-Z][^=;{}()<>[\]'"]*$/
const MODULE_STATEMENT = /^\s*(import|export)\b/m

/** The longest fenced block, when the answer has any: the file, not a one-line example around it. */
const fencedCode = (answer: string): string | undefined =>
  [...answer.matchAll(FENCED_BLOCK)].map((match) => match[1]).sort((a, b) => b.length - a.length)[0]

const isTail = (line: string): boolean => line.trim() === '' || PROSE_LINE.test(line.trim())

/** The lines from the first one that looks like code, without blank or prose lines after the code. */
const codeLines = (text: string): string => {
  const lines = text.split(/\r?\n/)
  const first = lines.findIndex((line) => CODE_START.test(line))
  if (first < 0) return ''
  const fromEnd = [...lines].reverse().findIndex((line) => !isTail(line))
  const last = lines.length - 1 - fromEnd
  return lines.slice(first, last + 1).join('\n')
}

/** Reads the scene file from an answer; `component` is the export it must declare ("WhatMattersScene"). */
export const extractSceneSource = (answer: string, component: string): SceneAnswer => {
  if (answer.trim() === '') return { ok: false, reason: "Claude's answer was empty" }
  const source = codeLines(fencedCode(answer) ?? answer)
  if (source === '' || !MODULE_STATEMENT.test(source)) return { ok: false, reason: "Claude's answer is not a TSX module (no import or export)" }
  if (!new RegExp(`\\bexport\\s+(const|function)\\s+${component}\\b`).test(source)) {
    return { ok: false, reason: `Claude's answer does not export ${component}` }
  }
  return { ok: true, source: `${source.trimEnd()}\n` }
}
