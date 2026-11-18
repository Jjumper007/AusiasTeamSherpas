/// <reference types="node" />
import { isDeepStrictEqual } from 'node:util'
import type { Brief, Facts, Survey, VideoProps } from '@sherpas/shared'
import type { JobResult } from '../api/types'
import { loadCase } from '../brief/case-loader'
import { generateCaseOutputs } from '../brief/generate'
import { buildJobResult } from '../pipeline/job-result'
import { numberGuardProblems } from '../scenes/check-scenes'
import { figureProblems } from '../script/script-check'
import { findAdult, type Adult } from '../survey/members'

/**
 * Checks a finished run before it goes into the demo (#11): every figure must match the case. Pure:
 * the files are read by `run-files.ts`, and the case is rebuilt with the brief generator, without
 * Claude, the voice or Chrome. Every problem is a sentence for the person adding the video.
 */

/** What a run folder holds, already parsed. */
export interface RunData {
  readonly result: JobResult
  readonly props: VideoProps
  readonly survey: Survey
  /** `.ts`/`.tsx` under the sandbox's src/scenes and src/components, by path; null when the run has no sandbox. */
  readonly sceneSources: ReadonlyMap<string, string> | null
  /** log.txt, null when missing. */
  readonly log: string | null
}

/** The case as the generator builds it today for this person and their survey: the truth to compare with. */
export interface CaseTruth {
  readonly adult: Adult
  readonly brief: Brief
  readonly facts: Facts
}

export interface RunReport {
  /** Empty when the run can go into the demo. */
  readonly problems: readonly string[]
  /** What was checked or skipped, and which scenes the video used. */
  readonly info: readonly string[]
}

export type ScenesSource = 'claude' | 'standard' | 'unknown'

/** Differences shown per comparison; the rest are counted. */
const MAX_DIFFS = 8
const MAX_VALUE_CHARS = 80

/** Rebuilds the brief and facts from `cases/` with the survey the run used. Throws a `BriefError` for an unknown case or member. */
export const caseTruth = (caseId: string, member: string, survey: Survey): CaseTruth => {
  const caseData = loadCase(caseId)
  const adult = findAdult(caseData, member)
  const { brief, facts } = generateCaseOutputs(caseData, adult.firstName, survey)
  return { adult, brief, facts }
}

interface Difference {
  readonly path: string
  readonly found: unknown
  readonly expected: unknown
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const childPath = (path: string, key: string | number): string => (path ? `${path}.${key}` : String(key))

/** Every leaf where `found` and `expected` differ, as a dotted path ("chapters.2.startSec"). */
export const differences = (found: unknown, expected: unknown, path = ''): Difference[] => {
  if (Array.isArray(found) && Array.isArray(expected) && found.length === expected.length) {
    return found.flatMap((item, index) => differences(item, expected[index], childPath(path, index)))
  }
  if (isRecord(found) && isRecord(expected)) {
    const keys = [...new Set([...Object.keys(expected), ...Object.keys(found)])]
    return keys.flatMap((key) => differences(found[key], expected[key], childPath(path, key)))
  }
  return isDeepStrictEqual(found, expected) ? [] : [{ path, found, expected }]
}

const show = (value: unknown): string => {
  if (value === undefined) return 'nothing'
  const text = JSON.stringify(value)
  return text.length > MAX_VALUE_CHARS ? `${text.slice(0, MAX_VALUE_CHARS)}…` : text
}

/** One sentence per difference, at most MAX_DIFFS, then how many more there are. */
const describeDifferences = (where: string, diffs: readonly Difference[]): string[] => {
  const shown = diffs
    .slice(0, MAX_DIFFS)
    .map((diff) => `${where} ${diff.path}: found ${show(diff.found)}, expected ${show(diff.expected)}`)
  const hidden = diffs.length - shown.length
  return hidden > 0 ? [...shown, `${where}: … and ${hidden} more differences`] : shown
}

/** Every fact the video used must be a fact of the case today, with the same value and unit. */
export const factProblems = (used: Facts, truth: Facts): string[] =>
  Object.entries(used).flatMap(([name, fact]) => {
    if (!Object.hasOwn(truth, name)) return [`Fact ${name} is not a fact of the case.`]
    const real = truth[name]
    return [
      ...(fact.value === real.value ? [] : [`Fact ${name} is ${fact.value} in the video but ${real.value} in the case.`]),
      ...(fact.unit === real.unit ? [] : [`Fact ${name} is in ${fact.unit} in the video but in ${real.unit} in the case.`]),
    ]
  })

/** The brief behind the video (score, pillars, top moves, survey…) must be the one the case gives today. */
export const briefProblems = (used: Brief, truth: Brief): string[] =>
  describeDifferences('video-props.json brief', differences(used, truth))

/** The number guard over everything said or shown as text: narration, chapters and the call to action. */
export const narrationProblems = (script: VideoProps['script'], facts: Facts): string[] =>
  figureProblems(script, facts).map((message) => `Script: ${message}`)

/** What the video's render line in log.txt says. Runs from before the scenes step say neither. */
export const scenesSource = (log: string | null): ScenesSource => {
  const render = log?.split('\n').find((line) => line.includes('[render]')) ?? ''
  if (render.includes("with Claude's scenes")) return 'claude'
  if (render.includes('with the standard scenes')) return 'standard'
  return 'unknown'
}

const SCENES_INFO: Readonly<Record<ScenesSource, string>> = {
  claude: "The video used Claude's scenes.",
  standard: 'The video used the standard scenes (the template).',
  unknown: 'log.txt does not say which scenes the video used.',
}

/** The number guard over Claude's scene files, when the video was rendered from them. */
const sceneCodeCheck = (data: RunData, facts: Facts): RunReport => {
  const source = scenesSource(data.log)
  if (data.sceneSources === null) {
    return source === 'claude'
      ? { problems: ["log.txt says the video used Claude's scenes, but the run has no video-template/ copy to check."], info: [] }
      : { problems: [], info: ['No video-template/ copy in the run: no scene code of Claude to check.'] }
  }
  if (source === 'standard') {
    return { problems: [], info: ['The video-template/ copy was not rendered (standard scenes), so its code is not checked.'] }
  }
  return {
    problems: numberGuardProblems(data.sceneSources, facts).map((message) => `Scene code: ${message}`),
    info: [`Number guard run over ${data.sceneSources.size} scene and component files.`],
  }
}

/** The fields of result.json the player page shows, compared with what `buildJobResult` gives from video-props.json. */
const COMPARED_FIELDS = [
  'caseId',
  'member',
  'name',
  'partner',
  'survey',
  'durationSec',
  'chapters',
  'cta',
  'firstStep',
  'firstStepScore',
  'waitGap',
  'detail',
] as const satisfies ReadonlyArray<keyof JobResult>

/** result.json must be exactly what the pipeline builds today from the run's video-props.json. */
export const resultProblems = (result: JobResult, props: VideoProps, adult: Adult): string[] => {
  const expected = buildJobResult({
    runId: result.runId,
    caseId: props.brief.caseId,
    member: adult.id,
    partner: adult.partner,
    brief: props.brief,
    facts: props.facts,
    script: props.script,
    timings: props.scenes,
    videoUrl: result.videoUrl,
  })
  const diffs = COMPARED_FIELDS.flatMap((field) => differences(result[field], expected[field], field))
  return describeDifferences('result.json', diffs)
}

/** Every check of a parsed run against the case. */
export const checkRun = (data: RunData, truth: CaseTruth): RunReport => {
  const scenes = sceneCodeCheck(data, truth.facts)
  return {
    problems: [
      ...factProblems(data.props.facts, truth.facts),
      ...briefProblems(data.props.brief, truth.brief),
      ...narrationProblems(data.props.script, truth.facts),
      ...scenes.problems,
      ...resultProblems(data.result, data.props, truth.adult),
    ],
    info: [
      `${Object.keys(data.props.facts).length} facts compared with the case.`,
      SCENES_INFO[scenesSource(data.log)],
      ...scenes.info,
    ],
  }
}
