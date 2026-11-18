import { describe, expect, test } from 'vitest'
import { listCaseIds, loadCase } from './case-loader'
import { parsePersona } from './persona-parser'

const CLASSIFICATION_BLOCK = [
  '```classification',
  'D0: EMERGING',
  'D1: MID ACCUMULATION',
  'D2: MODERATE',
  'D3: SIGNIFICANT GAPS',
  'D4a: MODERATE',
  'D4: MISALIGNED',
  'D5: DUAL',
  'D6: PROTECTION',
  'concerns:',
  '- O1 SIGNIFICANT',
  '```',
].join('\n')

const personaWith = (concernLine: string, tensionLine: string): string =>
  ['## Objective concerns', '', concernLine, '', '## Tensions', '', tensionLine, '', CLASSIFICATION_BLOCK].join('\n')

describe('parsePersona', () => {
  test('reads the classification block, keeping only D0 to D6', () => {
    const persona = parsePersona(personaWith('- **O1: Retirement (SIGNIFICANT).** Gap.', '- **T1 (HIGH):** Clash.'))

    expect(persona.classification).toEqual({
      D0: 'EMERGING',
      D1: 'MID ACCUMULATION',
      D2: 'MODERATE',
      D3: 'SIGNIFICANT GAPS',
      D4: 'MISALIGNED',
      D5: 'DUAL',
      D6: 'PROTECTION',
    })
  })

  test('parses a concern written as "O1: Title (SEVERITY)."', () => {
    const persona = parsePersona(
      personaWith('- **O1: Retirement (SIGNIFICANT).** The gap is $1,427,456.', '- **T1 (HIGH):** Clash.'),
    )

    expect(persona.concerns).toEqual([
      { id: 'O1', title: 'Retirement', severity: 'SIGNIFICANT', text: 'The gap is $1,427,456.' },
    ])
  })

  test('parses a concern written as "O3 SEVERITY: Title." and drops the "Connected:" cross-reference', () => {
    const persona = parsePersona(
      personaWith(
        '- **O3 SIGNIFICANT: Life insurance shortfall of $720,000.** He has $180,000. Connected: D3.',
        '- **T1 (HIGH):** Clash.',
      ),
    )

    expect(persona.concerns).toEqual([
      {
        id: 'O3',
        title: 'Life insurance shortfall of $720,000',
        severity: 'SIGNIFICANT',
        text: 'He has $180,000.',
      },
    ])
  })

  test('parses a tension written as "T1 (LEVEL):"', () => {
    const persona = parsePersona(personaWith('- **O1: A (MINOR).** B.', '- **T1 (HIGH):** O1 against O4.'))

    expect(persona.tensions).toEqual([{ id: 'T1', level: 'HIGH', text: 'O1 against O4.' }])
  })

  test('parses a titled tension "T2: Title (LEVEL)." and keeps the title in the text', () => {
    const persona = parsePersona(
      personaWith('- **O1: A (MINOR).** B.', '- **T2: Growth against depletion (MEDIUM).** Both are aggressive.'),
    )

    expect(persona.tensions).toEqual([
      { id: 'T2', level: 'MEDIUM', text: 'Growth against depletion. Both are aggressive.' },
    ])
  })

  test('throws a clear error when the classification block is missing', () => {
    expect(() => parsePersona('# Persona\n\n- **O1: A (MINOR).** B.')).toThrow(/classification block/)
  })

  test('throws a clear error when a D key is missing from the block', () => {
    const withoutD6 = personaWith('- **O1: A (MINOR).** B.', '- **T1 (LOW):** C.').replace('D6: PROTECTION\n', '')

    expect(() => parsePersona(withoutD6)).toThrow(/D6/)
  })

  test('throws when a concern line does not match a known format', () => {
    expect(() => parsePersona(personaWith('- **O1 — Retirement** text', '- **T1 (LOW):** C.'))).toThrow(/O1/)
  })
})

describe('parsePersona on the real persona files', () => {
  test('finds four cases', () => {
    expect(listCaseIds()).toEqual([
      'daniel-emily-johnson',
      'michael-carter',
      'samantha-lewis',
      'timothy-melanie-weah',
    ])
  })

  test.each([
    ['daniel-emily-johnson', 8, 5, 'DUAL'],
    ['michael-carter', 8, 5, 'COLLABORATOR'],
    ['samantha-lewis', 9, 3, 'VALIDATOR'],
    ['timothy-melanie-weah', 7, 4, 'COLLABORATOR'],
  ])('%s has %i concerns, %i tensions and D5 %s', (caseId, concernCount, tensionCount, d5) => {
    const { persona } = loadCase(caseId)

    expect(persona.concerns).toHaveLength(concernCount)
    expect(persona.tensions).toHaveLength(tensionCount)
    expect(persona.classification.D5).toBe(d5)
    expect(persona.concerns.map((concern) => concern.id)).toEqual(
      Array.from({ length: concernCount }, (_, index) => `O${index + 1}`),
    )
  })

  test('reads severity from both header layouts', () => {
    expect(loadCase('michael-carter').persona.concerns[0]).toMatchObject({
      id: 'O1',
      title: 'Retirement shortfall',
      severity: 'SIGNIFICANT',
    })
    expect(loadCase('samantha-lewis').persona.concerns[0]).toMatchObject({
      id: 'O1',
      severity: 'CRITICAL',
    })
  })
})
