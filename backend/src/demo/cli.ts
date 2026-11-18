/// <reference types="node" />
import { resolve } from 'node:path'
import { loadEnvFile } from '../env'
import { demoDir } from '../paths'
import { addToDemo } from './demo-folder'
import { SITE_DATA_FILE, writeDemoSite } from './demo-site'
import { verifyRunFolder } from './run-files'

/**
 * Puts a finished run into the demo (#11), after checking that every figure matches the case, and
 * writes the demo site's data:
 *
 *   npm run demo:check -w backend -- runs/daniel-emily-johnson/emily/<timestamp>   only the checks
 *   npm run demo:add -w backend -- runs/daniel-emily-johnson/emily/<timestamp>     checks, then copies
 *   npm run demo:site -w backend -- demo-site                                      demo.json + videos (npm run demo:build)
 *
 * Folders are relative to where the command is typed. The demo folder is DEMO_DIR (or its default).
 */

const EXIT_FAILURE = 1
const ARGS_START = 2
const COMMANDS = ['check', 'add', 'site'] as const
type Command = (typeof COMMANDS)[number]
const USAGE = [
  'Usage: npm run demo:check -w backend -- <run folder>',
  '       npm run demo:add -w backend -- <run folder>',
  '       npm run demo:site -w backend -- <site folder>',
].join('\n')

const isCommand = (value: string | undefined): value is Command => (COMMANDS as readonly (string | undefined)[]).includes(value)

/** npm runs workspace scripts from backend/; INIT_CWD is where the command was typed. */
const resolveFromCaller = (path: string): string => resolve(process.env.INIT_CWD ?? process.cwd(), path)

const printList = (lines: readonly string[]): void => lines.forEach((line) => console.log(`  - ${line}`))

/** Checks a run folder and, for `add`, copies it into the demo folder. */
const checkOrAdd = (command: 'check' | 'add', runDir: string): number => {
  console.log(`Checking ${runDir}`)
  const report = verifyRunFolder(runDir)
  printList(report.info)
  if (report.problems.length > 0) {
    console.error(`\n${report.problems.length} problem(s): this run cannot go into the demo.`)
    report.problems.forEach((problem) => console.error(`  - ${problem}`))
    return EXIT_FAILURE
  }
  console.log('Every check passed.')
  if (command === 'check' || !report.person) return 0
  const target = addToDemo(demoDir(), report.person, runDir)
  console.log(`Added to the demo: ${target} (result.json, video.mp4 and replay.json)`)
  return 0
}

/** Writes demo.json and the videos into the built site. */
const writeSite = (siteDir: string): number => {
  const site = writeDemoSite(demoDir(), siteDir)
  console.log(`Wrote ${SITE_DATA_FILE} and the videos to ${siteDir}:`)
  printList(site.members.map(({ survey, result }) => `${survey.name} (${result.survey.explainLevel} · ${result.survey.topOfMind} · ${result.survey.decisionStyle})`))
  return 0
}

const run = (argv: readonly string[]): number => {
  const [command, path, ...extra] = argv
  if (!isCommand(command) || !path || extra.length > 0) {
    console.error(USAGE)
    return EXIT_FAILURE
  }
  loadEnvFile()
  const folder = resolveFromCaller(path)
  return command === 'site' ? writeSite(folder) : checkOrAdd(command, folder)
}

try {
  process.exitCode = run(process.argv.slice(ARGS_START))
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = EXIT_FAILURE
}
