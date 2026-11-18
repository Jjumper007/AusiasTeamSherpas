import type { Script } from '@sherpas/shared'
import { describe, expect, it } from 'vitest'
import { checkScript, extractJson } from './script-check'
import { danielCase } from './script-fixtures.test-helper'

const { brief, facts, script } = danielCase()

const withScene = (index: number, change: Partial<Script['scenes'][number]>): Script =>
  ({ ...script, scenes: script.scenes.map((scene, i) => (i === index ? { ...scene, ...change } : scene)) }) as Script

const problemsOf = (answer: string): readonly string[] => {
  const check = checkScript(answer, brief, facts)
  return check.ok ? [] : check.problems
}

describe('checkScript', () => {
  it('accepts a valid script, also inside Markdown fences', () => {
    expect(checkScript(JSON.stringify(script), brief, facts)).toEqual({ ok: true, script })
    expect(checkScript(`Here it is:\n\`\`\`json\n${JSON.stringify(script)}\n\`\`\``, brief, facts).ok).toBe(true)
  })

  it('rejects an answer that is not JSON, or does not match the schema', () => {
    expect(problemsOf('Sorry, I cannot do that.')[0]).toMatch(/not valid JSON/)
    expect(problemsOf(JSON.stringify({ ...script, chapters: script.chapters.slice(0, 4) }))[0]).toMatch(/^Schema: chapters/)
  })

  it('always takes the call to action type from the survey', () => {
    const check = checkScript(JSON.stringify({ ...script, cta: { ...script.cta, type: 'wait' } }), brief, facts)
    expect(check.ok && check.script.cta.type).toBe('research_first')
  })

  it('rejects figures that do not come from facts, with the nearest fact', () => {
    const problems = problemsOf(JSON.stringify(withScene(2, { narration: 'You need about $24,500 a year more.' })))
    expect(problems.join(' ')).toMatch(/"\$24,500".*does not come from facts/)
  })

  it('rejects a hook without the nickname or longer than about 8 seconds', () => {
    expect(problemsOf(JSON.stringify(withScene(0, { narration: 'Here is your plan.' })))).toEqual([
      'The hook must call them by their nickname, "Dan".',
    ])
    const long = `Dan, ${'and then more words '.repeat(6)}`
    expect(problemsOf(JSON.stringify(withScene(0, { narration: long })))[0]).toMatch(/keep it to 18 or fewer/)
  })

  it('rejects unknown fact names and score facts out of the order the video reads', () => {
    expect(problemsOf(JSON.stringify(withScene(2, { factsUsed: ['MADE_UP'] })))).toEqual([
      'Scene "what_matters" declares MADE_UP in factsUsed, which is not in the list of facts.',
    ])
    expect(problemsOf(JSON.stringify(withScene(1, { factsUsed: [] })))).toEqual([
      'Scene "where_you_are" must list SCORE_NOW first in factsUsed.',
    ])
    expect(problemsOf(JSON.stringify(withScene(4, { factsUsed: ['SCORE_NOW'] })))[0]).toMatch(
      /^Scene "what_changes" must start factsUsed with SCORE_NOW then SCORE_AFTER_/,
    )
  })

  it('rejects a narration too long for the video', () => {
    const long = Array.from({ length: 260 }, () => 'word').join(' ')
    expect(problemsOf(JSON.stringify(withScene(3, { narration: long })))[0]).toMatch(/words in total/)
  })
})

describe('extractJson', () => {
  it('takes the first complete object, ignoring braces in strings and in prose after it', () => {
    expect(extractJson('Sure: {"a": "x } y", "b": {"c": 1}} Let me know if {anything} changes.')).toEqual({
      a: 'x } y',
      b: { c: 1 },
    })
    expect(() => extractJson('{"a": 1')).toThrow('no complete JSON object')
  })
})
