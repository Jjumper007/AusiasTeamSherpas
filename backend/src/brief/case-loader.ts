/// <reference types="node" />
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PlanSchema, type Plan } from './case-schema'
import { BriefError, describeIssues } from './errors'
import { parsePersona, type Persona } from './persona-parser'

const CASES_DIR = fileURLToPath(new URL('../../../cases/', import.meta.url))
const PLAN_FILE = 'financial-health.json'
const PERSONA_FILE = 'persona.md'

/** One case, read from disk and validated: the financial plan plus the parsed persona. */
export interface CaseData {
  readonly caseId: string
  readonly plan: Plan
  readonly persona: Persona
}

/** Ids of the cases on disk (the folder names under `cases/`), sorted. */
export const listCaseIds = (): string[] => {
  if (!existsSync(CASES_DIR)) throw new BriefError(`Cases folder not found at ${CASES_DIR}`)
  return readdirSync(CASES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(CASES_DIR, entry.name, PLAN_FILE)))
    .map((entry) => entry.name)
    .sort()
}

const readCaseFile = (caseId: string, fileName: string): string => {
  const filePath = join(CASES_DIR, caseId, fileName)
  try {
    return readFileSync(filePath, 'utf8')
  } catch (cause) {
    throw new BriefError(`Could not read ${filePath}`, { cause })
  }
}

const parsePlan = (caseId: string, text: string): Plan => {
  const json = parseJson(text, `${caseId}/${PLAN_FILE}`)
  const result = PlanSchema.safeParse(json)
  if (!result.success) {
    throw new BriefError(`${caseId}/${PLAN_FILE} is not in the expected shape: ${describeIssues(result.error.issues)}`)
  }
  return result.data
}

/** Parses JSON text, naming the source in the error. */
export const parseJson = (text: string, source: string): unknown => {
  try {
    return JSON.parse(text)
  } catch (cause) {
    throw new BriefError(`${source} is not valid JSON`, { cause })
  }
}

/**
 * Loads one case. The id must be one of the folders under `cases/`, which also keeps
 * path-like input ("../x") from reaching the file system.
 */
export const loadCase = (caseId: string): CaseData => {
  const caseIds = listCaseIds()
  if (!caseIds.includes(caseId)) {
    throw new BriefError(`Unknown case "${caseId}". Available cases: ${caseIds.join(', ')}`)
  }
  return {
    caseId,
    plan: parsePlan(caseId, readCaseFile(caseId, PLAN_FILE)),
    persona: parsePersona(readCaseFile(caseId, PERSONA_FILE)),
  }
}
