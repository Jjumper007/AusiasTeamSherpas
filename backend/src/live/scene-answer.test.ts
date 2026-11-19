import { describe, expect, it } from 'vitest'
import { extractSceneSource } from './scene-answer'

const SOURCE = [
  "import type { FC } from 'react'",
  "import type { SceneProps } from './types'",
  '',
  '/** Part 3. */',
  'export const WhatMattersScene: FC<SceneProps> = () => {',
  '  return null',
  '}',
].join('\n')

describe('extractSceneSource', () => {
  it('takes an answer that is only the file', () => {
    // Act
    const read = extractSceneSource(SOURCE, 'WhatMattersScene')

    // Assert
    expect(read).toEqual({ ok: true, source: `${SOURCE}\n` })
  })

  it('takes the code out of a Markdown fence with prose around it', () => {
    // Arrange
    const answer = `Here is the new scene:\n\n\`\`\`tsx\n${SOURCE}\n\`\`\`\n\nIt reveals the gap first.`

    // Act
    const read = extractSceneSource(answer, 'WhatMattersScene')

    // Assert
    expect(read).toEqual({ ok: true, source: `${SOURCE}\n` })
  })

  it('takes the longest fenced block when the answer has several', () => {
    // Arrange
    const answer = `Use \`fmt\` like this:\n\`\`\`ts\nfmt.round(fact)\n\`\`\`\n\`\`\`typescript\n${SOURCE}\n\`\`\``

    // Act
    const read = extractSceneSource(answer, 'WhatMattersScene')

    // Assert
    expect(read).toEqual({ ok: true, source: `${SOURCE}\n` })
  })

  it('drops a line of prose before and after unfenced code', () => {
    // Arrange
    const answer = `Here is the file.\n${SOURCE}\nThis keeps every figure in facts.`

    // Act
    const read = extractSceneSource(answer, 'WhatMattersScene')

    // Assert
    expect(read).toEqual({ ok: true, source: `${SOURCE}\n` })
  })

  it('keeps a last line of code that ends in a string or a name', () => {
    // Arrange
    const source = `${SOURCE}\nexport const wrong: number = 'text'\nexport const alias = WhatMattersScene`

    // Act
    const read = extractSceneSource(`${source}\n\nThat is all.`, 'WhatMattersScene')

    // Assert
    expect(read).toEqual({ ok: true, source: `${source}\n` })
  })

  it('refuses an empty answer', () => {
    // Act
    const read = extractSceneSource('  \n', 'WhatMattersScene')

    // Assert
    expect(read).toEqual({ ok: false, reason: "Claude's answer was empty" })
  })

  it('refuses an answer that is not a TSX module', () => {
    // Act
    const read = extractSceneSource('I cannot design this scene without more context.', 'WhatMattersScene')

    // Assert
    expect(read).toEqual({ ok: false, reason: "Claude's answer is not a TSX module (no import or export)" })
  })

  it("refuses a module that does not export the part's component", () => {
    // Act
    const read = extractSceneSource(SOURCE, 'FirstStepScene')

    // Assert
    expect(read).toEqual({ ok: false, reason: "Claude's answer does not export FirstStepScene" })
  })
})
