/// <reference types="node" />
import { join } from 'node:path'
import type { Script } from '@sherpas/shared'
import { loadCase } from '../brief/case-loader'
import { parseCliArgs, resolveSurvey } from '../brief/cli-args'
import { BriefError } from '../brief/errors'
import { generateCaseOutputs } from '../brief/generate'
import { buildSurveyOptions } from '../brief/survey-options'
import { RUNS_DIR } from '../paths'
import { createRunFolder } from '../pipeline/run-folder'
import { runClaudeCli } from './claude-cli'
import { writeScript } from './write-script'

/**
 * Writes one script with Claude, without voice or render, to review its tone (#6):
 *
 *   npm run script -w backend -- daniel-emily-johnson Daniel --explain-level nerd --decision-style research_first
 *
 * Same survey flags as the brief CLI. Output in runs/scripts/<caseId>/<member>/<timestamp>/.
 */

const EXIT_FAILURE = 1
const SCRIPT_ARGS_START = 2

const readable = (script: Script): string =>
  [
    ...script.scenes.map(
      (scene, index) =>
        `## ${index + 1}. ${scene.part}\n${scene.narration}\n  visual: ${scene.visualIdea}\n  facts: ${scene.factsUsed.join(', ') || '-'}`,
    ),
    '## Chapters',
    ...script.chapters.map((chapter) => `- ${chapter.title}: ${chapter.body}`),
    `## CTA (${script.cta.type})\n${script.cta.text}`,
  ].join('\n\n')

const run = async (argv: ReadonlyArray<string>): Promise<void> => {
  const args = parseCliArgs(argv)
  const caseData = loadCase(args.caseId)
  const survey = resolveSurvey(args.surveyFlags, args.member, buildSurveyOptions(caseData))
  const { brief, facts } = generateCaseOutputs(caseData, args.member, survey)
  const folder = createRunFolder(join(RUNS_DIR, 'scripts'), caseData.caseId, args.member.toLowerCase(), new Date())
  const written = await writeScript({
    brief,
    facts,
    folder,
    runClaude: runClaudeCli,
    onAttempt: (attempt, max) => console.error(`Attempt ${attempt} of ${max}…`),
  })
  console.log(readable(written.script))
  console.error(`\nSource: ${written.source}, attempts: ${written.attempts}. Folder: ${folder.dir}`)
}

run(process.argv.slice(SCRIPT_ARGS_START)).catch((error: unknown) => {
  if (!(error instanceof BriefError)) throw error
  console.error(`Error: ${error.message}`)
  process.exitCode = EXIT_FAILURE
})
