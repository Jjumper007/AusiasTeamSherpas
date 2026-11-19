/// <reference types="node" />
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** One job's folder: runs/<caseId>/<member>/<timestamp>/ with everything it produced (SPEC §5). */
export interface RunFolder {
  /** "<caseId>/<member>/<timestamp>", also the URL path under /runs. */
  readonly runId: string
  readonly dir: string
  /** Absolute path of a file in the folder. */
  path(fileName: string): string
  writeText(fileName: string, text: string): void
  writeJson(fileName: string, value: unknown): void
  /** Appends a timestamped line to log.txt. */
  log(line: string): void
}

const LOG_FILE = 'log.txt'
const JSON_INDENT = 2

/** "2026-11-18T16-05-03-123Z": an ISO timestamp that is safe in a folder name. */
const folderTimestamp = (date: Date): string => date.toISOString().replace(/[:.]/g, '-')

export const createRunFolder = (runsDir: string, caseId: string, member: string, now: Date): RunFolder => {
  const runId = [caseId, member, folderTimestamp(now)].join('/')
  const dir = join(runsDir, caseId, member, folderTimestamp(now))
  mkdirSync(dir, { recursive: true })
  return openRunFolder(dir, runId)
}

/** A run folder that already exists, e.g. a Live run's whose MP4 is made again from the command line (#17). */
export const openRunFolder = (dir: string, runId: string): RunFolder => {
  const path = (fileName: string): string => join(dir, fileName)
  return {
    runId,
    dir,
    path,
    writeText: (fileName, text) => writeFileSync(path(fileName), text),
    writeJson: (fileName, value) => writeFileSync(path(fileName), `${JSON.stringify(value, null, JSON_INDENT)}\n`),
    log: (line) => appendFileSync(path(LOG_FILE), `${new Date().toISOString()} ${line}\n`),
  }
}
