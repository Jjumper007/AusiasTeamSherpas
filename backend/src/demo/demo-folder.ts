/// <reference types="node" />
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { JobResult, ReplayStep } from '../api/types'
import { describeIssues } from '../brief/errors'
import { JobResultSchema } from './result-schema'
import { replaySteps, ReplaySchema } from './run-replay'

/**
 * The demo folder (#11): one finished video per adult, copied there by `npm run demo:add` after the
 * run passes the checks. Layout: <demoDir>/<caseId>/<member>/result.json + video.mp4 + replay.json
 * (the steps of the run that made the video, from its log.txt). `npm run demo:build` turns it into
 * the demo site.
 */

export const DEMO_RESULT_FILE = 'result.json'
export const DEMO_VIDEO_FILE = 'video.mp4'
export const DEMO_REPLAY_FILE = 'replay.json'
const LOG_FILE = 'log.txt'
const DEMO_FILES = [DEMO_RESULT_FILE, DEMO_VIDEO_FILE, DEMO_REPLAY_FILE] as const

/** An adult with a demo video. */
export interface DemoPerson {
  readonly caseId: string
  readonly member: string
}

const MAX_SLUG_LENGTH = 64
/** Lower-case words joined by single hyphens: "daniel-emily-johnson", "emily". Nothing path-like gets through. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const isSlug = (value: string): boolean => value.length <= MAX_SLUG_LENGTH && SLUG_PATTERN.test(value)

/** A demo file that exists but cannot be used, or a run that cannot go into the demo. */
export class DemoFileError extends Error {
  override readonly name = 'DemoFileError'
}

const personDir = (demoDir: string, { caseId, member }: DemoPerson): string => join(demoDir, caseId, member)

const assertPerson = (person: DemoPerson): void => {
  if (!isSlug(person.caseId) || !isSlug(person.member)) {
    throw new DemoFileError(`Not a valid case or member id: "${person.caseId}/${person.member}"`)
  }
}

const isFile = (path: string): boolean => existsSync(path) && statSync(path).isFile()

const hasDemoVideo = (demoDir: string, person: DemoPerson): boolean =>
  DEMO_FILES.every((name) => isFile(join(personDir(demoDir, person), name)))

/** Sub-folders of `dir` whose names are slugs, sorted; none when `dir` does not exist. */
const slugFolders = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && isSlug(entry.name))
        .map((entry) => entry.name)
        .sort()
    : []

/** Everyone with all three demo files, by case then member. */
export const listDemoPeople = (demoDir: string): DemoPerson[] =>
  slugFolders(demoDir)
    .flatMap((caseId) => slugFolders(join(demoDir, caseId)).map((member) => ({ caseId, member })))
    .filter((person) => hasDemoVideo(demoDir, person))

/** Where a person's demo video is on disk. */
export const demoVideoFile = (demoDir: string, person: DemoPerson): string => join(personDir(demoDir, person), DEMO_VIDEO_FILE)

const parseJson = (text: string, source: string): unknown => {
  try {
    return JSON.parse(text)
  } catch (cause) {
    throw new DemoFileError(`${source} is not valid JSON`, { cause })
  }
}

/** Parses an untrusted result.json. Throws a `DemoFileError` naming what is wrong. */
export const parseResult = (text: string, source: string): JobResult => {
  const parsed = JobResultSchema.safeParse(parseJson(text, source))
  if (!parsed.success) throw new DemoFileError(`${source} is not a video result: ${describeIssues(parsed.error.issues)}`)
  return parsed.data
}

/**
 * A person's demo result as the run wrote it. null when they have no demo video; throws a
 * `DemoFileError` when the ids are not slugs or the file is broken.
 */
export const readDemoResult = (demoDir: string, person: DemoPerson): JobResult | null => {
  assertPerson(person)
  if (!hasDemoVideo(demoDir, person)) return null
  const source = join(person.caseId, person.member, DEMO_RESULT_FILE)
  return parseResult(readFileSync(join(personDir(demoDir, person), DEMO_RESULT_FILE), 'utf8'), source)
}

/** The steps of the run that made a person's demo video. Throws a `DemoFileError` when missing or broken. */
export const readDemoReplay = (demoDir: string, person: DemoPerson): ReplayStep[] => {
  assertPerson(person)
  const source = join(person.caseId, person.member, DEMO_REPLAY_FILE)
  const path = join(personDir(demoDir, person), DEMO_REPLAY_FILE)
  if (!isFile(path)) throw new DemoFileError(`${source} is missing. Add the run again with: npm run demo:add -w backend -- <run folder>`)
  const parsed = ReplaySchema.safeParse(parseJson(readFileSync(path, 'utf8'), source))
  if (!parsed.success) throw new DemoFileError(`${source} is not a run replay: ${describeIssues(parsed.error.issues)}`)
  return parsed.data
}

/** The replay of a run folder, from its log.txt. Throws a `DemoFileError` when the log does not show a finished video. */
const replayOfRun = (runDir: string): ReplayStep[] => {
  const log = join(runDir, LOG_FILE)
  const steps = isFile(log) ? replaySteps(readFileSync(log, 'utf8')) : null
  if (!steps) throw new DemoFileError(`${LOG_FILE} of ${runDir} does not show the video being written, so the demo cannot replay its steps.`)
  return steps
}

/** Writes through a dot-file and renames, so a reader never sees half a file. */
const replaceFile = (write: (partial: string) => void, to: string, dir: string, name: string): void => {
  const partial = join(dir, `.${name}.partial`)
  write(partial)
  renameSync(partial, to)
}

/** Copies a run's result.json and video.mp4 into the person's demo folder with its replay.json, replacing earlier ones. Returns that folder. */
export const addToDemo = (demoDir: string, person: DemoPerson, runDir: string): string => {
  assertPerson(person)
  const replay = replayOfRun(runDir)
  const dir = personDir(demoDir, person)
  mkdirSync(dir, { recursive: true })
  // result.json last: the person is listed only once all three files are there.
  replaceFile((partial) => copyFileSync(join(runDir, DEMO_VIDEO_FILE), partial), join(dir, DEMO_VIDEO_FILE), dir, DEMO_VIDEO_FILE)
  replaceFile((partial) => writeFileSync(partial, `${JSON.stringify(replay, null, 2)}\n`), join(dir, DEMO_REPLAY_FILE), dir, DEMO_REPLAY_FILE)
  replaceFile((partial) => copyFileSync(join(runDir, DEMO_RESULT_FILE), partial), join(dir, DEMO_RESULT_FILE), dir, DEMO_RESULT_FILE)
  return dir
}
