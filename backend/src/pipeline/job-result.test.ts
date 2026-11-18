import { describe, expect, it } from 'vitest'
import { listCaseIds, loadCase } from '../brief/case-loader'
import { generateCaseOutputs } from '../brief/generate'
import { buildFallbackScript } from '../script/fallback-script'
import { estimateSceneTimings } from '../script/scene-timing'
import { adultsOf } from '../survey/members'
import { buildJobResult, sceneStarts } from './job-result'
import { SCENES_START_SEC, videoDurationSec } from './video-timeline'

/** The JobResult of every adult, built without Claude, the voice or the renderer. */
const results = listCaseIds()
  .map(loadCase)
  .flatMap((caseData) =>
    adultsOf(caseData).map((adult) => {
      const survey = { nickname: adult.firstName, explainLevel: 'straight', topOfMind: 'retirement', decisionStyle: 'wait' } as const
      const { brief, facts } = generateCaseOutputs(caseData, adult.firstName, survey)
      const script = buildFallbackScript(brief, facts)
      return buildJobResult({
        runId: `${caseData.caseId}/${adult.id}/test`,
        caseId: caseData.caseId,
        member: adult.id,
        partner: adult.partner,
        brief,
        facts,
        script,
        timings: estimateSceneTimings(script),
        videoUrl: '/runs/test/video.mp4',
      })
    }),
  )

const byMember = Object.fromEntries(results.map((result) => [result.member, result]))

describe('buildJobResult: first-step figures from facts', () => {
  it('covers the six adults', () => {
    expect(Object.keys(byMember).sort()).toEqual(['daniel', 'emily', 'melanie', 'michael', 'samantha', 'timothy'])
  })

  it.each([
    ['daniel', '52', '57'],
    ['emily', '52', '57'],
    ['michael', '26', '31'],
    ['samantha', '82', '84'],
    ['timothy', '60', '62'],
    ['melanie', '60', '62'],
  ])('gives %s the score change SCORE_NOW → SCORE_AFTER_<first move>', (member, now, after) => {
    expect(byMember[member].firstStepScore).toEqual({ now, after })
  })

  it.each([
    ['daniel', 'RAISE_MORTALITY_COVERAGE_AMOUNT', 'Life cover still missing', '$1,166,000'],
    ['emily', 'RAISE_MORTALITY_COVERAGE_AMOUNT', 'Life cover still missing', '$1,166,000'],
    ['michael', 'ADD_UMBRELLA_COVER_AMOUNT', 'Umbrella cover still missing', '$1,000,000'],
    ['timothy', 'CREDIT_CARD_BALANCE', 'Card balance still charging interest', '$18,000'],
    ['melanie', 'CREDIT_CARD_BALANCE', 'Card balance still charging interest', '$18,000'],
  ])('gives %s the gap waiting leaves open from %s', (member, name, label, value) => {
    expect(byMember[member].waitGap).toEqual({ name, label, value })
  })

  it('has no gap figure for Samantha, whose first step (homeowners insurance) has no fact', () => {
    expect(byMember.samantha.firstStep.title).toBe('Close a coverage gap')
    expect(byMember.samantha.waitGap).toBeNull()
  })
})

describe('sceneStarts and durationSec: the logo opening and closing', () => {
  const timings = [{ durationSec: 6 }, { durationSec: 18 }, { durationSec: 15 }, { durationSec: 12 }, { durationSec: 14 }] as const

  it('starts the first chapter after the opening and each next one after the previous scene', () => {
    const starts = sceneStarts([...timings] as never)

    expect(starts[0]).toBeCloseTo(SCENES_START_SEC, 1)
    expect(starts[1]).toBeCloseTo(SCENES_START_SEC + 6, 1)
    expect(starts[4]).toBeCloseTo(SCENES_START_SEC + 51, 1)
  })

  it('reports the length of the whole MP4, longer than the narration', () => {
    const daniel = byMember.daniel
    const narration = daniel.chapters.at(-1)!.startSec - SCENES_START_SEC

    expect(daniel.durationSec).toBeGreaterThan(narration + SCENES_START_SEC)
    expect(videoDurationSec([...timings] as never)).toBeGreaterThan(65 + SCENES_START_SEC)
  })
})
