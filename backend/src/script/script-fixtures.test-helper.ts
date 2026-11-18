import type { DecisionStyle, ExplainLevel, TopicId } from '@sherpas/shared'
import { buildBrief } from '../brief/brief-extractor'
import { loadCase } from '../brief/case-loader'
import { buildFacts } from '../brief/facts'
import { buildFallbackScript } from './fallback-script'

/** Daniel's brief, facts and script without Claude, for the tests of Claude's script. */
export const danielCase = (
  explainLevel: ExplainLevel = 'straight',
  decisionStyle: DecisionStyle = 'research_first',
  topOfMind: TopicId = 'retirement',
) => {
  const caseData = loadCase('daniel-emily-johnson')
  const facts = buildFacts(caseData)
  const brief = buildBrief(caseData, 'Daniel', { nickname: 'Dan', explainLevel, topOfMind, decisionStyle })
  return { brief, facts, script: buildFallbackScript(brief, facts) }
}
