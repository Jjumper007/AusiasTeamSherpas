/// <reference types="node" />
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { DemoPerson, JobResult } from '../api/types'
import { describeIssues } from '../brief/errors'
import { JobResultSchema } from './result-schema'

/**
 * The demo folder (#11): one finished video per adult, copied there by `npm run demo:add` after the
 * run passes the checks. Layout: <demoDir>/<caseId>/<member>/result.json + video.mp4. It is read
 * from disk on every request, so a video added while the server runs shows up at once.
 */

export const DEMO_RESULT_FILE = 'result.json'
export const DEMO_VIDEO_FILE = 'video.mp4'
/** URL prefix the demo folder is served under (demo mode only). */
export const DEMO_URL_PREFIX = '/demo'

const MAX_SLUG_LENGTH = 64
/** Lower-case words joined by single hyphens: "daniel-emily-johnson", "emily". Nothing path-like gets through. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const isSlug = (value: string): boolean => value.length <= MAX_SLUG_LENGTH && SLUG_PATTERN.test(value)

/** A demo file that exists but cannot be used: invalid JSON or not a result. */
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
  isFile(join(personDir(demoDir, person), DEMO_RESULT_FILE)) && isFile(join(personDir(demoDir, person), DEMO_VIDEO_FILE))

/** Sub-folders of `dir` whose names are slugs, sorted; none when `dir` does not exist. */
const slugFolders = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && isSlug(entry.name))
        .map((entry) => entry.name)
        .sort()
    : []

/** Everyone with both demo files, by case then member. */
export const listDemoPeople = (demoDir: string): DemoPerson[] =>
  slugFolders(demoDir)
    .flatMap((caseId) => slugFolders(join(demoDir, caseId)).map((member) => ({ caseId, member })))
    .filter((person) => hasDemoVideo(demoDir, person))

/** Where the browser fetches a person's demo video. */
export const demoVideoUrl = ({ caseId, member }: DemoPerson): string =>
  `${DEMO_URL_PREFIX}/${caseId}/${member}/${DEMO_VIDEO_FILE}`

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
 * A person's demo result, with its video pointing at the demo folder. null when they have no demo
 * video; throws a `DemoFileError` when the ids are not slugs or the file is broken.
 */
export const readDemoResult = (demoDir: string, person: DemoPerson): JobResult | null => {
  assertPerson(person)
  if (!hasDemoVideo(demoDir, person)) return null
  const source = join(person.caseId, person.member, DEMO_RESULT_FILE)
  const result = parseResult(readFileSync(join(personDir(demoDir, person), DEMO_RESULT_FILE), 'utf8'), source)
  return { ...result, videoUrl: demoVideoUrl(person) }
}

/** Copies through a dot-file and renames, so a running server never serves half a video (dot-files are not served). */
const replaceFile = (from: string, to: string, dir: string, name: string): void => {
  const partial = join(dir, `.${name}.partial`)
  copyFileSync(from, partial)
  renameSync(partial, to)
}

/** Copies a run's result.json and video.mp4 into the person's demo folder, replacing earlier ones. Returns that folder. */
export const addToDemo = (demoDir: string, person: DemoPerson, runDir: string): string => {
  assertPerson(person)
  const dir = personDir(demoDir, person)
  mkdirSync(dir, { recursive: true })
  // The video first: the person is listed only once both files are there.
  const files = [DEMO_VIDEO_FILE, DEMO_RESULT_FILE]
  files.forEach((name) => replaceFile(join(runDir, name), join(dir, name), dir, name))
  return dir
}
