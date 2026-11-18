/// <reference types="node" />
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Survey, SurveyOption } from '@sherpas/shared'
import { briefSizeBytes } from './brief-extractor'
import { loadCase, parseJson } from './case-loader'
import { parseCliArgs, resolveSurvey, type CliArgs } from './cli-args'
import { BriefError } from './errors'
import { generateCaseOutputs, type CaseOutputs } from './generate'
import { parseSurveyInput } from './survey-input'
import { buildSurveyOptions } from './survey-options'

/**
 * One command for a case and a member: prints (or writes with --out) the brief,
 * `facts.ts` and the options for "What's on your mind most?".
 *
 *   npx tsx backend/src/brief/cli.ts daniel-emily-johnson Daniel --top-of-mind retirement
 */

const JSON_INDENT = 2
const EXIT_FAILURE = 1
const SCRIPT_ARGS_START = 2

const BRIEF_FILE = 'brief.json'
const FACTS_FILE = 'facts.ts'
const SURVEY_OPTIONS_FILE = 'survey-options.json'

const toJson = (value: unknown): string => `${JSON.stringify(value, null, JSON_INDENT)}\n`

const readSurveyFile = (surveyPath: string): Survey => {
  try {
    return parseSurveyInput(parseJson(readFileSync(surveyPath, 'utf8'), surveyPath))
  } catch (cause) {
    if (cause instanceof BriefError) throw cause
    throw new BriefError(`Could not read the survey file ${surveyPath}`, { cause })
  }
}

const surveyFrom = (args: CliArgs, surveyOptions: ReadonlyArray<SurveyOption>): Survey =>
  args.surveyPath === undefined
    ? resolveSurvey(args.surveyFlags, args.member, surveyOptions)
    : readSurveyFile(args.surveyPath)

const filesOf = (outputs: CaseOutputs): ReadonlyArray<readonly [string, string]> => [
  [SURVEY_OPTIONS_FILE, toJson(outputs.surveyOptions)],
  [BRIEF_FILE, toJson(outputs.brief)],
  [FACTS_FILE, outputs.factsSource],
]

const writeFiles = (outDir: string, files: ReadonlyArray<readonly [string, string]>): void => {
  try {
    mkdirSync(outDir, { recursive: true })
    files.forEach(([fileName, content]) => writeFileSync(join(outDir, fileName), content, 'utf8'))
  } catch (cause) {
    throw new BriefError(`Could not write to ${outDir}`, { cause })
  }
  files.forEach(([fileName]) => console.log(`Wrote ${join(outDir, fileName)}`))
}

const printFiles = (files: ReadonlyArray<readonly [string, string]>): void =>
  files.forEach(([fileName, content]) => console.log(`=== ${fileName} ===\n${content}`))

const run = (argv: ReadonlyArray<string>): void => {
  const args = parseCliArgs(argv)
  const caseData = loadCase(args.caseId)
  const survey = surveyFrom(args, buildSurveyOptions(caseData))
  const outputs = generateCaseOutputs(caseData, args.member, survey)
  const files = filesOf(outputs)

  if (args.outDir === undefined) printFiles(files)
  else writeFiles(args.outDir, files)

  const factCount = Object.keys(outputs.facts).length
  console.error(`Brief: ${briefSizeBytes(outputs.brief)} bytes of compact JSON. Facts: ${factCount}.`)
}

try {
  run(process.argv.slice(SCRIPT_ARGS_START))
} catch (error) {
  if (!(error instanceof BriefError)) throw error
  console.error(`Error: ${error.message}`)
  process.exitCode = EXIT_FAILURE
}
