/// <reference types="node" />
import { parseArgs } from 'node:util'
import type { ExplainLevel, DecisionStyle, Survey, SurveyOption } from '@sherpas/shared'
import { BriefError } from './errors'
import { parseSurveyInput } from './survey-input'

export const USAGE = [
  'Usage: npx tsx backend/src/brief/cli.ts <caseId> <member> [survey.json] [flags]',
  '',
  'Survey, either as a JSON file ({ nickname, explainLevel, topOfMind, decisionStyle }) or as flags:',
  '  --nickname <text>          default: the member name',
  '  --explain-level <level>    simple | straight | nerd (default: straight)',
  '  --top-of-mind <topic>      one of the case survey options (default: the first one)',
  '  --decision-style <style>   just_do_it | research_first | ask_trusted | wait (default: research_first)',
  '',
  'Output:',
  '  --out <dir>                write brief.json, facts.ts and survey-options.json there instead of printing',
].join('\n')

const DEFAULT_EXPLAIN_LEVEL: ExplainLevel = 'straight'
const DEFAULT_DECISION_STYLE: DecisionStyle = 'research_first'

const REQUIRED_POSITIONALS = 2
const MAX_POSITIONALS = 3

/** Survey answers as typed on the command line, before validation. */
export type SurveyFlags = Partial<Record<keyof Survey, string>>

export interface CliArgs {
  readonly caseId: string
  readonly member: string
  readonly surveyPath: string | undefined
  readonly surveyFlags: SurveyFlags
  readonly outDir: string | undefined
}

const usageError = (problem: string): BriefError => new BriefError(`${problem}\n\n${USAGE}`)

const readArgv = (argv: ReadonlyArray<string>) => {
  try {
    return parseArgs({
      args: [...argv],
      allowPositionals: true,
      options: {
        nickname: { type: 'string' },
        'explain-level': { type: 'string' },
        'top-of-mind': { type: 'string' },
        'decision-style': { type: 'string' },
        out: { type: 'string' },
      },
    })
  } catch (cause) {
    throw usageError(cause instanceof Error ? cause.message : 'Could not read the arguments')
  }
}

const withoutUndefined = (flags: SurveyFlags): SurveyFlags =>
  Object.fromEntries(Object.entries(flags).filter(([, value]) => value !== undefined))

/** Reads the command line (without `node` and the script path). Throws a `BriefError` carrying the usage text. */
export const parseCliArgs = (argv: ReadonlyArray<string>): CliArgs => {
  const { values, positionals } = readArgv(argv)
  if (positionals.length < REQUIRED_POSITIONALS || positionals.length > MAX_POSITIONALS) {
    throw usageError('Expected a case id and a member first name.')
  }
  const [caseId, member, surveyPath] = positionals
  const surveyFlags = withoutUndefined({
    nickname: values.nickname,
    explainLevel: values['explain-level'],
    topOfMind: values['top-of-mind'],
    decisionStyle: values['decision-style'],
  })
  if (surveyPath !== undefined && Object.keys(surveyFlags).length > 0) {
    throw usageError('Give either a survey JSON path or survey flags, not both.')
  }
  return { caseId, member, surveyPath, surveyFlags, outDir: values.out }
}

/** Completes the survey flags with defaults and validates the result. */
export const resolveSurvey = (
  flags: SurveyFlags,
  memberFirstName: string,
  surveyOptions: ReadonlyArray<SurveyOption>,
): Survey =>
  parseSurveyInput({
    nickname: flags.nickname ?? memberFirstName,
    explainLevel: flags.explainLevel ?? DEFAULT_EXPLAIN_LEVEL,
    topOfMind: flags.topOfMind ?? surveyOptions[0]?.id,
    decisionStyle: flags.decisionStyle ?? DEFAULT_DECISION_STYLE,
  })
