import { fmt, type Brief, type Facts, type Part, type Script, type VideoProps } from '@sherpas/shared'
import type { ChapterMark, FactDetail, JobResult } from '../api/types'
import { firstStepScore, waitGap } from './first-step-figures'

export interface JobResultInput {
  readonly runId: string
  readonly caseId: string
  readonly member: string
  readonly partner: string | null
  readonly brief: Brief
  readonly facts: Facts
  readonly script: Script
  readonly timings: VideoProps['scenes']
  readonly videoUrl: string
}

const TENTHS = 10
const roundToTenth = (seconds: number): number => Math.round(seconds * TENTHS) / TENTHS

/** Start of each scene, in seconds from the start of the video. */
export const sceneStarts = (timings: VideoProps['scenes']): number[] =>
  timings.map((_, index) => roundToTenth(timings.slice(0, index).reduce((sum, timing) => sum + timing.durationSec, 0)))

/** Parts whose figures back the first step. The pillar points of part 2 are context, not the why. */
const DETAIL_PARTS: ReadonlySet<Part> = new Set(['what_matters', 'first_step', 'what_changes'])

/** "Why this number?": the facts behind the first step, exact and without repeats, in order of appearance. */
export const factDetails = (script: Script, facts: Facts): FactDetail[] =>
  [...new Set(script.scenes.filter((scene) => DETAIL_PARTS.has(scene.part)).flatMap((scene) => scene.factsUsed))]
    .filter((name) => name in facts)
    .map((name) => ({ name, label: facts[name].label, value: fmt.fact(facts[name]) }))

export const buildJobResult = (input: JobResultInput): JobResult => {
  const { brief, facts, script, timings } = input
  const move = brief.topMoves[0]
  const starts = sceneStarts(timings)
  const chapters: ChapterMark[] = script.chapters.map((chapter, index) => ({ ...chapter, startSec: starts[index] }))
  return {
    runId: input.runId,
    caseId: input.caseId,
    member: input.member,
    name: brief.survey.nickname,
    partner: input.partner,
    survey: brief.survey,
    videoUrl: input.videoUrl,
    durationSec: roundToTenth(timings.reduce((sum, timing) => sum + timing.durationSec, 0)),
    chapters,
    cta: script.cta,
    firstStep: move,
    firstStepScore: firstStepScore(move, facts),
    waitGap: waitGap(move, facts),
    detail: factDetails(script, facts),
  }
}
