import {
  DECISION_STYLES,
  EXPLAIN_LEVELS,
  ScriptSchema,
  validateNarration,
  type DecisionStyle,
  type ExplainLevel,
  type Survey,
  type TopicId,
} from '@sherpas/shared'
import { describe, expect, it } from 'vitest'
import { buildBrief } from '../brief/brief-extractor'
import { listCaseIds, loadCase, type CaseData } from '../brief/case-loader'
import { buildFacts } from '../brief/facts'
import { buildSurveyOptions } from '../brief/survey-options'
import { adultsOf } from '../survey/members'
import { buildFallbackScript } from './fallback-script'
import { estimateSceneTimings, MAX_HOOK_SEC, MIN_VIDEO_SEC } from './scene-timing'

const cases = listCaseIds().map(loadCase)

const scriptFor = (caseData: CaseData, member: string, survey: Survey) => {
  const facts = buildFacts(caseData)
  const brief = buildBrief(caseData, member, survey)
  return { brief, facts, script: buildFallbackScript(brief, facts) }
}

/** Every adult × topic × explain level × decision style the web can ask for. */
const combinations = cases.flatMap((caseData) =>
  adultsOf(caseData).flatMap((adult) =>
    buildSurveyOptions(caseData).flatMap(({ id: topOfMind }) =>
      EXPLAIN_LEVELS.flatMap((explainLevel) =>
        DECISION_STYLES.map((decisionStyle) => ({
          caseData,
          member: adult.firstName,
          survey: { nickname: adult.firstName, explainLevel, topOfMind, decisionStyle },
        })),
      ),
    ),
  ),
)

const daniel = (explainLevel: ExplainLevel, decisionStyle: DecisionStyle = 'research_first', topOfMind: TopicId = 'retirement') =>
  scriptFor(cases.find((c) => c.caseId === 'daniel-emily-johnson')!, 'Daniel', {
    nickname: 'Dan',
    explainLevel,
    topOfMind,
    decisionStyle,
  })

describe('buildFallbackScript', () => {
  it('produces a valid script whose every text passes the number guard, for every combination', () => {
    const failures = combinations.flatMap(({ caseData, member, survey }) => {
      const { script, facts } = scriptFor(caseData, member, survey)
      const texts = [
        ...script.scenes.map((scene) => scene.narration),
        ...script.chapters.map((chapter) => `${chapter.title}. ${chapter.body}`),
        script.cta.text,
      ]
      const schemaErrors = ScriptSchema.safeParse(script).success ? [] : ['schema']
      const guardErrors = texts.flatMap((text) => validateNarration(text, facts).errors.map((error) => error.message))
      return [...schemaErrors, ...guardErrors].map((error) => `${caseData.caseId}/${member} ${JSON.stringify(survey)}: ${error}`)
    })
    expect(combinations.length).toBeGreaterThan(100)
    expect(failures).toEqual([])
  })

  it('only declares facts that exist', () => {
    const unknown = combinations.flatMap(({ caseData, member, survey }) => {
      const { script, facts } = scriptFor(caseData, member, survey)
      return script.scenes.flatMap((scene) => scene.factsUsed.filter((name) => !(name in facts)))
    })
    expect(unknown).toEqual([])
  })

  it('opens with the nickname and the topic', () => {
    expect(daniel('simple').script.scenes[0].narration).toBe(
      'Dan, here is your plan in about a minute, starting with retiring when you plan to.',
    )
  })

  it('says more figures as the explain level goes up', () => {
    const figures = (level: ExplainLevel) => daniel(level).script.scenes[2].factsUsed
    expect(figures('simple')).toEqual(['RETIREMENT_GAP'])
    expect(figures('straight')).toHaveLength(3)
    expect(figures('nerd')).toHaveLength(5)
    expect(daniel('nerd').script.scenes[2].narration).toContain('$1,427,456')
    expect(daniel('straight').script.scenes[2].narration).toContain('$1.4M')
  })

  it('declares the score before and after the first move in part 5, in that order', () => {
    expect(daniel('straight').script.scenes[4].factsUsed).toEqual(['SCORE_NOW', 'SCORE_AFTER_RAISE_MORTALITY_COVERAGE'])
    expect(daniel('straight').script.scenes[4].narration).toContain('from 52 to 57')
  })

  it('shapes the call to action by decision style', () => {
    expect(daniel('simple', 'ask_trusted').script.cta).toEqual({
      type: 'ask_trusted',
      text: 'Send this to Emily and decide together.',
    })
    expect(daniel('simple', 'just_do_it').script.cta.text).toContain('10 minutes')
    expect(daniel('simple', 'wait').script.cta.text).toContain('stays at 52')
  })
})

describe('estimateSceneTimings', () => {
  it('keeps the hook within 8 s and the video at 60 s or more, for every combination', () => {
    const problems = combinations.flatMap(({ caseData, member, survey }) => {
      const timings = estimateSceneTimings(scriptFor(caseData, member, survey).script)
      const total = timings.reduce((sum, timing) => sum + timing.durationSec, 0)
      return timings[0].durationSec > MAX_HOOK_SEC || total < MIN_VIDEO_SEC ? [`${member}: ${total}`] : []
    })
    expect(problems).toEqual([])
  })

  it('gives longer narration more time', () => {
    const [, where] = estimateSceneTimings(daniel('nerd').script)
    const [, whereSimple] = estimateSceneTimings(daniel('simple').script)
    expect(where.durationSec).toBeGreaterThanOrEqual(whereSimple.durationSec)
  })
})
