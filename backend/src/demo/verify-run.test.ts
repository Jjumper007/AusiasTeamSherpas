import { describe, expect, it } from 'vitest'
import { emilyRun } from './demo-run.test-helper'
import { caseTruth, checkRun, differences, scenesSource, type RunData } from './verify-run'

const run = emilyRun()
const truth = caseTruth('daniel-emily-johnson', 'emily', run.survey)

const check = (data: RunData) => checkRun(data, truth)

const withFact = (name: string, change: object): RunData => ({
  ...run,
  props: { ...run.props, facts: { ...run.props.facts, [name]: { ...run.props.facts[name], ...change } } },
})

describe('checkRun', () => {
  it('passes a run that is exactly what the pipeline builds from the case', () => {
    const report = check(run)

    expect(report.problems).toEqual([])
    expect(report.info).toContain('The video used the standard scenes (the template).')
  })

  it('reports a fact whose value is not the one in the case', () => {
    const report = check(withFact('SCORE_NOW', { value: 61 }))

    expect(report.problems).toContain('Fact SCORE_NOW is 61 in the video but 52 in the case.')
  })

  it('reports a fact whose unit is not the one in the case', () => {
    expect(check(withFact('SCORE_NOW', { unit: 'usd' })).problems).toContain(
      'Fact SCORE_NOW is in usd in the video but in points in the case.',
    )
  })

  it('reports a fact the case does not have', () => {
    const report = check(withFact('MADE_UP_TOTAL', { value: 1, unit: 'count', label: 'Made up' }))

    expect(report.problems).toContain('Fact MADE_UP_TOTAL is not a fact of the case.')
  })

  it('reports a brief figure that differs from the case', () => {
    const score = { ...run.props.brief.score, value: 70 }
    const report = check({ ...run, props: { ...run.props, brief: { ...run.props.brief, score } } })

    expect(report.problems).toContain('video-props.json brief score.value: found 70, expected 52')
  })

  it('runs the number guard over chapters and narration', () => {
    const [first, ...rest] = run.props.script.chapters
    const chapters = [{ ...first, body: `${first.body} You could save 4500000 dollars.` }, ...rest] as typeof run.props.script.chapters
    const report = check({ ...run, props: { ...run.props, script: { ...run.props.script, chapters } } })

    expect(report.problems.some((problem) => problem.startsWith('Script:') && problem.includes('4500000'))).toBe(true)
  })

  it("runs the number guard over Claude's scene code", () => {
    const sceneSources = new Map([['src/scenes/HookScene.tsx', 'export const Hook = () => <div>$4,500,000</div>\n']])
    const report = check({ ...run, sceneSources, log: "[render] video.mp4 written with Claude's scenes" })

    expect(report.problems.some((problem) => problem.startsWith('Scene code: src/scenes/HookScene.tsx'))).toBe(true)
    expect(report.info).toContain("The video used Claude's scenes.")
  })

  it('does not check a sandbox the video was not rendered from', () => {
    const sceneSources = new Map([['src/scenes/HookScene.tsx', 'export const Hook = () => <div>$4,500,000</div>\n']])

    expect(check({ ...run, sceneSources }).problems).toEqual([])
  })

  it("reports Claude's scenes in the log with no sandbox to check", () => {
    const report = check({ ...run, log: "[render] video.mp4 written with Claude's scenes" })

    expect(report.problems).toEqual([
      "log.txt says the video used Claude's scenes, but the run has no video-template/ copy to check.",
    ])
  })

  it('reports chapter starts and figures of result.json that video-props.json does not give', () => {
    const chapters = run.result.chapters.map((chapter, index) => (index === 0 ? { ...chapter, startSec: 0 } : chapter))
    const report = check({ ...run, result: { ...run.result, chapters, firstStepScore: null } })

    expect(report.problems).toContain(`result.json chapters.0.startSec: found 0, expected ${run.result.chapters[0].startSec}`)
    expect(report.problems).toContain('result.json firstStepScore: found null, expected {"now":"52","after":"57"}')
  })

  it('reports a partner that is not the one in the case', () => {
    expect(check({ ...run, result: { ...run.result, partner: 'Oliver' } }).problems).toContain(
      'result.json partner: found "Oliver", expected "Daniel"',
    )
  })

  it('caps a long list of differences', () => {
    const chapters = run.result.chapters.map((chapter) => ({ ...chapter, title: 'x', body: 'y', startSec: 0 }))
    const problems = check({ ...run, result: { ...run.result, chapters } }).problems

    expect(problems).toHaveLength(9)
    expect(problems.at(-1)).toBe('result.json: … and 7 more differences')
  })
})

describe('differences', () => {
  it('names each leaf that differs, by path', () => {
    expect(differences({ a: [1, { b: 2 }], c: 'x' }, { a: [1, { b: 3 }], c: 'x' })).toEqual([
      { path: 'a.1.b', found: 2, expected: 3 },
    ])
  })

  it('treats arrays of another length and missing keys as one difference', () => {
    expect(differences({ a: [1] }, { a: [1, 2], b: true })).toEqual([
      { path: 'a', found: [1], expected: [1, 2] },
      { path: 'b', found: undefined, expected: true },
    ])
  })
})

describe('scenesSource', () => {
  it.each([
    ["[render] video.mp4 written with Claude's scenes", 'claude'],
    ['[render] video.mp4 written with the standard scenes', 'standard'],
    ['[render] video.mp4 written', 'unknown'],
    [null, 'unknown'],
  ] as const)('reads %s as %s', (log, source) => {
    expect(scenesSource(log)).toBe(source)
  })
})
