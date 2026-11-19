import type { Scene, Script } from '@sherpas/shared'
import { describe, expect, it } from 'vitest'
import { chapterProblems, checkScript, ctaProblems, sceneProblems } from './script-check'
import { danielCase } from './script-fixtures.test-helper'

const { brief, facts, script } = danielCase()

const changedScene = (index: number, change: Partial<Scene>): Scene => ({ ...script.scenes[index], ...change }) as Scene

/** Problems of each of the five scenes, checked one by one. */
const problemsByScene = (scenes: readonly Scene[]): string[][] => scenes.map((scene) => sceneProblems(scene, brief, facts))

const withScenes = (changes: Readonly<Record<number, Partial<Scene>>>): Script =>
  ({ ...script, scenes: script.scenes.map((scene, i) => ({ ...scene, ...changes[i] })) }) as Script

describe('sceneProblems', () => {
  it('accepts every scene of the script without Claude', () => {
    // Act
    const problems = problemsByScene(script.scenes)

    // Assert
    expect(problems).toEqual([[], [], [], [], []])
  })

  it('finds an invented figure in that scene alone', () => {
    // Arrange
    const scenes = script.scenes.map((scene, i) => (i === 2 ? changedScene(2, { narration: 'You need about $24,500 a year more.' }) : scene))

    // Act
    const problems = problemsByScene(scenes)

    // Assert
    expect(problems[2].join(' ')).toMatch(/"\$24,500".*does not come from facts/)
    expect(problems.filter((_, i) => i !== 2)).toEqual([[], [], [], []])
  })

  it('finds a hook without the nickname, or longer than about 8 seconds', () => {
    // Arrange
    const noNickname = changedScene(0, { narration: 'Here is your plan.' })
    const tooLong = changedScene(0, { narration: `Dan, ${'and then more words '.repeat(6)}` })

    // Act
    const missing = sceneProblems(noNickname, brief, facts)
    const long = sceneProblems(tooLong, brief, facts)

    // Assert
    expect(missing).toEqual(['The hook must call them by their nickname, "Dan".'])
    expect(long).toEqual(['The hook has 25 words; keep it to 18 or fewer (about 8 seconds).'])
  })

  it('applies the hook rules to the hook only', () => {
    // Arrange
    const withoutNickname = changedScene(3, { narration: 'Your first step is to save a little more each month.' })

    // Act
    const problems = sceneProblems(withoutNickname, brief, facts)

    // Assert
    expect(problems).toEqual([])
  })

  it('finds a factsUsed name that is not a fact', () => {
    // Arrange
    const scene = changedScene(2, { factsUsed: ['MADE_UP'] })

    // Act
    const problems = sceneProblems(scene, brief, facts)

    // Assert
    expect(problems).toEqual(['Scene "what_matters" declares MADE_UP in factsUsed, which is not in the list of facts.'])
  })

  it('checks the score facts of parts 2 and 5 on each scene by itself', () => {
    // Arrange
    const where = changedScene(1, { factsUsed: [] })
    const changes = changedScene(4, { factsUsed: ['SCORE_NOW'] })

    // Act
    const whereProblems = sceneProblems(where, brief, facts)
    const changesProblems = sceneProblems(changes, brief, facts)

    // Assert
    expect(whereProblems).toEqual(['Scene "where_you_are" must list SCORE_NOW first in factsUsed.'])
    expect(changesProblems).toEqual([
      `Scene "what_changes" must start factsUsed with SCORE_NOW then ${script.scenes[4].factsUsed[1]}.`,
    ])
  })
})

describe('chapterProblems and ctaProblems', () => {
  it('accept the chapters and the call to action of the script without Claude', () => {
    // Act
    const chapters = script.chapters.map((chapter) => chapterProblems(chapter, facts))
    const cta = ctaProblems(script.cta, facts)

    // Assert
    expect(chapters).toEqual([[], [], [], [], []])
    expect(cta).toEqual([])
  })

  it('find an invented figure in a chapter title or body, and in the call to action', () => {
    // Arrange
    const title = { ...script.chapters[1], title: 'Your $24,500 gap' }
    const body = { ...script.chapters[2], body: 'You need about $24,500 a year more.' }
    const cta = { ...script.cta, text: 'Book a call and save $24,500.' }

    // Act
    const problems = [chapterProblems(title, facts), chapterProblems(body, facts), ctaProblems(cta, facts)]

    // Assert
    problems.forEach((found) => expect(found.join(' ')).toMatch(/"\$24,500".*does not come from facts/))
  })
})

describe('checkScript as the sum of its parts', () => {
  it('reports the problems of several parts by kind, in the order it always has', () => {
    // Arrange: an invented figure in the hook comes after an unknown fact in part 3, as before.
    const broken = withScenes({
      0: { narration: 'Here is your $24,500 plan.' },
      1: { factsUsed: [] },
      2: { factsUsed: ['MADE_UP'] },
    })

    // Act
    const check = checkScript(JSON.stringify(broken), brief, facts)

    // Assert
    const problems = check.ok ? [] : check.problems
    expect(problems.slice(0, 3)).toEqual([
      'The hook must call them by their nickname, "Dan".',
      'Scene "what_matters" declares MADE_UP in factsUsed, which is not in the list of facts.',
      'Scene "where_you_are" must list SCORE_NOW first in factsUsed.',
    ])
    expect(problems.slice(3).join(' ')).toMatch(/"\$24,500".*does not come from facts/)
  })

  it('finds the same problems as the per-part checks, plus the total length', () => {
    // Arrange
    const long = Array.from({ length: 260 }, () => 'word').join(' ')
    const broken = withScenes({ 3: { narration: long } })

    // Act
    const check = checkScript(JSON.stringify(broken), brief, facts)
    const parts = problemsByScene(broken.scenes).flat()

    // Assert
    expect(parts).toEqual([])
    const problems = check.ok ? [] : check.problems
    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatch(/^The narration has \d+ words in total; keep it between 150 and 220\.$/)
  })
})
