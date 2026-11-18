import type { Fact, Facts } from '@sherpas/shared'

const HEADER = [
  '// Generated from the case JSON by backend/src/brief. Do not edit by hand.',
  '// Percent values are fractions (0.49 means 49%). Values are exact and unrounded.',
  "import type { Facts } from '@sherpas/shared'",
].join('\n')

const constantLine = ([name, fact]: readonly [string, Fact]): string =>
  `/** ${fact.label.replaceAll('*/', '* /')} (${fact.unit}) */\nexport const ${name} = ${fact.value}`

const objectLine = ([name, fact]: readonly [string, Fact]): string =>
  `  ${name}: { value: ${name}, unit: ${JSON.stringify(fact.unit)}, label: ${JSON.stringify(fact.label)} },`

/**
 * Renders a `facts.ts` module: one named constant per fact (`export const SCORE_NOW = 52`)
 * plus `FACTS`, the full object, so units and labels are available at runtime.
 */
export const renderFactsSource = (facts: Facts): string => {
  const entries = Object.entries(facts)
  return [
    HEADER,
    '',
    entries.map(constantLine).join('\n\n'),
    '',
    '/** Every fact with its unit and label, keyed by constant name. */',
    'export const FACTS = {',
    entries.map(objectLine).join('\n'),
    '} satisfies Facts',
    '',
  ].join('\n')
}
