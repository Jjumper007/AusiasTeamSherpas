import { fmt, type Brief, type Fact, type Facts } from '@sherpas/shared'
import { partnerOf, SCORE_FACT, scoreAfterFactName } from './fallback-script'
import { fillPlaceholders } from './prompt-template'

export { promptVersion } from './prompt-template'

/**
 * Fills `prompts/script.md` for one person (SPEC §5.2). Pure: the template is read by the caller,
 * so the same brief and facts always give the same prompt.
 */

const JSON_INDENT = 2

/** "$1.4M" or "$1,427,456": the spellings the number guard accepts for a fact, short one first. */
export const sayItAs = (fact: Fact): string[] => [...new Set([fmt.round(fact), fmt.fact(fact)])]

/** Pipes would break the Markdown table. */
const cell = (text: string): string => text.replace(/\|/g, '/')

/** The facts as a Markdown table, in the order of `facts.ts`. */
export const factsTable = (facts: Facts): string =>
  [
    '| Name | Say it as | Unit | What it is |',
    '| --- | --- | --- | --- |',
    ...Object.entries(facts).map(
      ([name, fact]) =>
        `| ${name} | ${sayItAs(fact).map((form) => `"${form}"`).join(' or ')} | ${fact.unit} | ${cell(fact.label)} |`,
    ),
  ].join('\n')

/** What part 5 must say about the score, depending on whether the first step raises it. */
const scoreChange = (brief: Brief, facts: Facts): string => {
  const [move] = brief.topMoves
  const afterFact = scoreAfterFactName(move)
  if (move.scoreAfter > move.scoreBefore && afterFact in facts) {
    return `the score goes from ${move.scoreBefore} to ${move.scoreAfter}. \`factsUsed\` must start with \`${SCORE_FACT}\` then \`${afterFact}\`, in that order.`
  }
  return 'this move does not raise the score, so do not promise a score change; say which gap it closes instead.'
}

const placeholderValues = (brief: Brief, facts: Facts): Readonly<Record<string, string>> => ({
  SURVEY: JSON.stringify(brief.survey, null, JSON_INDENT),
  PARTNER: partnerOf(brief) ?? 'null',
  BRIEF: JSON.stringify(brief, null, JSON_INDENT),
  FIRST_STEP: JSON.stringify(brief.topMoves[0], null, JSON_INDENT),
  FACTS: factsTable(facts),
  SCORE_CHANGE: scoreChange(brief, facts),
  DECISION_STYLE: brief.survey.decisionStyle,
})

/** Fills `prompts/script.md`. Throws on a placeholder it does not know, so a typo never reaches Claude. */
export const fillScriptPrompt = (template: string, brief: Brief, facts: Facts): string =>
  fillPlaceholders(template, placeholderValues(brief, facts), 'prompts/script.md')

/** The prompt for a retry: the original one, plus the rejected answer and why it was rejected. */
export const retryPrompt = (prompt: string, previousAnswer: string, problems: ReadonlyArray<string>): string =>
  [
    prompt,
    '## Your previous answer was rejected',
    'Your previous answer:',
    '```',
    previousAnswer.trim(),
    '```',
    'Problems to fix:',
    ...problems.map((problem) => `- ${problem}`),
    'Reply with the corrected JSON object only, following every rule above.',
  ].join('\n\n')
