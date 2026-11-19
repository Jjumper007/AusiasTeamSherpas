import { scriptFixture } from '@sherpas/shared'
import { describe, expect, it } from 'vitest'
import { createScriptExtractor, type ExtractedPart } from './script-extractor'

/** Feeds `chunks` one after the other and returns every part handed over, in order. */
const extractAll = (chunks: readonly string[]): { parts: ExtractedPart[]; closed: boolean } => {
  const extractor = createScriptExtractor()
  const parts = chunks.flatMap((chunk) => extractor.push(chunk))
  return { parts, closed: extractor.closed() }
}

/** Splits `text` into pieces of the given sizes, cycling through them. */
const cut = (text: string, sizes: readonly number[]): string[] => {
  const pieces: string[] = []
  let at = 0
  let turn = 0
  while (at < text.length) {
    const size = sizes[turn % sizes.length]
    pieces.push(text.slice(at, at + size))
    at += size
    turn += 1
  }
  return pieces
}

const parsed = (parts: readonly ExtractedPart[]) => parts.map((part) => ({ ...part, text: JSON.parse(part.text) as unknown }))

const answer = JSON.stringify(scriptFixture, null, 2)

/** What the extractor hands over for the whole fixture: scenes, then chapters, then the CTA. */
const expected = [
  ...scriptFixture.scenes.map((scene, index) => ({ kind: 'scene', index, text: scene })),
  ...scriptFixture.chapters.map((chapter, index) => ({ kind: 'chapter', index, text: chapter })),
  { kind: 'cta', index: 0, text: scriptFixture.cta },
]

describe('createScriptExtractor', () => {
  it('hands over each scene, chapter and the CTA of a whole answer, in the order they close', () => {
    // Act
    const { parts, closed } = extractAll([answer])

    // Assert
    expect(parsed(parts)).toEqual(expected)
    expect(closed).toBe(true)
  })

  it('gives the same parts when the answer arrives one character at a time', () => {
    // Act
    const { parts } = extractAll([...answer])

    // Assert
    expect(parsed(parts)).toEqual(expected)
  })

  it('gives the same parts for uneven chunks cut anywhere', () => {
    // Act
    const { parts } = extractAll(cut(answer, [7, 1, 13, 2, 31, 3]))

    // Assert
    expect(parsed(parts)).toEqual(expected)
  })

  it('hands over a scene as soon as its object closes, before the rest arrives', () => {
    // Arrange
    const extractor = createScriptExtractor()
    const firstSceneEnd = answer.indexOf('}') + 1

    // Act
    const early = extractor.push(answer.slice(0, firstSceneEnd))
    const rest = extractor.push(answer.slice(firstSceneEnd))

    // Assert
    expect(early.map((part) => `${part.kind} ${part.index}`)).toEqual(['scene 0'])
    expect(rest).toHaveLength(expected.length - 1)
  })

  it('keeps escaped quotes, backslashes and braces or brackets inside strings, even cut mid-escape', () => {
    // Arrange
    const tricky = {
      part: 'hook',
      narration: 'Dan, she said "{ not a brace }" and [no array] \\ here.',
      visualIdea: 'A "quote" \\"escaped\\" and a } brace',
      factsUsed: [],
    }
    const text = JSON.stringify({ scenes: [tricky], chapters: [], cta: { type: 'wait', text: 'Ok }' } })
    const escapeAt = text.indexOf('\\"')

    // Act
    const { parts } = extractAll([text.slice(0, escapeAt + 1), text.slice(escapeAt + 1, escapeAt + 2), text.slice(escapeAt + 2)])

    // Assert
    expect(parsed(parts)).toEqual([
      { kind: 'scene', index: 0, text: tricky },
      { kind: 'cta', index: 0, text: { type: 'wait', text: 'Ok }' } },
    ])
  })

  it('skips Markdown fences and prose around the JSON', () => {
    // Act
    const { parts, closed } = extractAll(['Here is the script:\n```json\n', answer, '\n```\nHope it helps {not json}.'])

    // Assert
    expect(parsed(parts)).toEqual(expected)
    expect(closed).toBe(true)
  })

  it('finds the parts whatever the order of the keys', () => {
    // Arrange
    const reordered = JSON.stringify({ cta: scriptFixture.cta, chapters: scriptFixture.chapters, scenes: scriptFixture.scenes })

    // Act
    const { parts } = extractAll(cut(reordered, [5, 9]))

    // Assert
    expect(parts.map((part) => `${part.kind} ${part.index}`)).toEqual([
      'cta 0',
      ...[0, 1, 2, 3, 4].map((index) => `chapter ${index}`),
      ...[0, 1, 2, 3, 4].map((index) => `scene ${index}`),
    ])
  })

  it('reads keys that are cut in the middle', () => {
    // Arrange
    const keyAt = answer.indexOf('"chapters"') + 4

    // Act
    const { parts } = extractAll([answer.slice(0, keyAt), answer.slice(keyAt)])

    // Assert
    expect(parts.filter((part) => part.kind === 'chapter')).toHaveLength(5)
  })

  it('hands over only the parts that closed when the answer stops halfway', () => {
    // Arrange
    const fourthScene = answer.indexOf('"first_step"')

    // Act
    const { parts, closed } = extractAll([answer.slice(0, fourthScene)])

    // Assert
    expect(parts.map((part) => `${part.kind} ${part.index}`)).toEqual(['scene 0', 'scene 1', 'scene 2'])
    expect(closed).toBe(false)
  })

  it('keeps a scene whole when it holds nested objects or arrays', () => {
    // Arrange
    const nested = { part: 'hook', narration: 'Hi', visualIdea: 'x', factsUsed: ['A', 'B'], extra: { deep: [1, { two: 2 }] } }

    // Act
    const { parts } = extractAll([JSON.stringify({ scenes: [nested, nested] })])

    // Assert
    expect(parsed(parts)).toEqual([
      { kind: 'scene', index: 0, text: nested },
      { kind: 'scene', index: 1, text: nested },
    ])
  })

  it('ignores text after the top-level object has closed', () => {
    // Arrange
    const extractor = createScriptExtractor()
    extractor.push(answer)

    // Act
    const later = extractor.push(answer)

    // Assert
    expect(later).toEqual([])
  })
})
