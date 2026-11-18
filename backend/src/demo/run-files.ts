/// <reference types="node" />
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { SurveySchema, VideoPropsSchema } from '@sherpas/shared'
import type { z } from 'zod'
import { BriefError, describeIssues } from '../brief/errors'
import { editableSources, PROPS_FILE, SANDBOX_DIR } from '../scenes/sandbox'
import { DEMO_RESULT_FILE, DEMO_VIDEO_FILE, DemoFileError, parseResult, type DemoPerson } from './demo-folder'
import { caseTruth, checkRun, type RunData, type RunReport } from './verify-run'

/**
 * Reads a run folder (runs/<caseId>/<member>/<timestamp>/) for the checks in `verify-run.ts`.
 * A missing or broken file is a problem, not a crash.
 */

const SURVEY_FILE = 'survey.json'
const LOG_FILE = 'log.txt'
/** The sandbox folders whose code ends up on screen: the scenes and their building blocks. */
const SCENE_CODE_DIRS = ['src/scenes/', 'src/components/']

type Read<T> = { readonly value: T; readonly problem?: undefined } | { readonly value?: undefined; readonly problem: string }

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error))

const readText = (runDir: string, name: string): Read<string> => {
  const path = join(runDir, name)
  if (!existsSync(path)) return { problem: `${name} is missing.` }
  try {
    return { value: readFileSync(path, 'utf8') }
  } catch (error) {
    return { problem: `${name} cannot be read: ${errorMessage(error)}` }
  }
}

const readJson = <T>(runDir: string, name: string, schema: z.ZodType<T>): Read<T> => {
  const text = readText(runDir, name)
  if (text.problem !== undefined) return text
  try {
    const parsed = schema.safeParse(JSON.parse(text.value))
    return parsed.success ? { value: parsed.data } : { problem: `${name} is not valid: ${describeIssues(parsed.error.issues)}` }
  } catch {
    return { problem: `${name} is not valid JSON.` }
  }
}

const readResult = (runDir: string): Read<RunData['result']> => {
  const text = readText(runDir, DEMO_RESULT_FILE)
  if (text.problem !== undefined) return text
  try {
    return { value: parseResult(text.value, DEMO_RESULT_FILE) }
  } catch (error) {
    if (error instanceof DemoFileError) return { problem: `${error.message}.` }
    throw error
  }
}

const videoProblems = (runDir: string): string[] => {
  const path = join(runDir, DEMO_VIDEO_FILE)
  if (!existsSync(path)) return [`${DEMO_VIDEO_FILE} is missing.`]
  return statSync(path).isFile() && statSync(path).size > 0 ? [] : [`${DEMO_VIDEO_FILE} is empty or not a file.`]
}

/** The scene and component sources of the run's sandbox, or null when the run has none. */
const readSceneSources = (runDir: string): ReadonlyMap<string, string> | null => {
  const sandboxDir = join(runDir, SANDBOX_DIR)
  if (!existsSync(sandboxDir)) return null
  return editableSources(sandboxDir, (key) => SCENE_CODE_DIRS.some((dir) => key.startsWith(dir)))
}

/** The parsed run, or every file problem found. */
export const readRun = (runDir: string): { readonly data?: RunData; readonly problems: readonly string[] } => {
  const result = readResult(runDir)
  const props = readJson(runDir, PROPS_FILE, VideoPropsSchema)
  const survey = readJson(runDir, SURVEY_FILE, SurveySchema)
  const problems = [
    ...[result.problem, props.problem, survey.problem].filter((problem) => problem !== undefined),
    ...videoProblems(runDir),
  ]
  if (problems.length > 0 || !result.value || !props.value || !survey.value) return { problems }
  const log = readText(runDir, LOG_FILE)
  return {
    data: { result: result.value, props: props.value, survey: survey.value, sceneSources: readSceneSources(runDir), log: log.value ?? null },
    problems: [],
  }
}

/** The checks of a run folder, and whose demo video it would be once they pass. */
export interface VerifiedRun extends RunReport {
  readonly person: DemoPerson | null
}

const failed = (problems: readonly string[]): VerifiedRun => ({ problems, info: [], person: null })

/** Reads a run folder and checks it against the case. */
export const verifyRunFolder = (runDir: string): VerifiedRun => {
  if (!existsSync(runDir) || !statSync(runDir).isDirectory()) return failed([`${runDir} is not a folder.`])
  const { data, problems } = readRun(runDir)
  if (!data) return failed(problems)
  try {
    const truth = caseTruth(data.props.brief.caseId, data.result.member, data.survey)
    return { ...checkRun(data, truth), person: { caseId: data.props.brief.caseId, member: truth.adult.id } }
  } catch (error) {
    if (error instanceof BriefError) return failed([error.message])
    throw error
  }
}
