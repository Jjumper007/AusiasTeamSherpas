/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { PARTS, VideoPropsSchema, type Part } from '@sherpas/shared'
import { RUNS_DIR } from '../paths'
import { renderCheckFrames } from '../pipeline/render-video'
import { createRunFolder } from '../pipeline/run-folder'
import { runClaudeCli } from '../script/claude-cli'
import { createScenesWriter, TARGET_PARTS } from './write-scenes'

/**
 * Runs only the scenes step (#9) on a finished run, to iterate on prompts/scenes.md without
 * paying for a new script or voice:
 *
 *   npm run scenes -w backend -- ../runs/daniel-emily-johnson/daniel/<timestamp> [--parts what_matters,hook]
 *
 * Reads its video-props.json; output (sandbox, attempts, check frames) in runs/scenes/<caseId>/<member>/<timestamp>/.
 */

const EXIT_FAILURE = 1
const ARGS_START = 2

const parseParts = (value: string | undefined): readonly Part[] => {
  if (!value) return TARGET_PARTS
  const parts = value.split(',')
  const unknown = parts.filter((part) => !(PARTS as readonly string[]).includes(part))
  if (unknown.length > 0) throw new Error(`Unknown parts: ${unknown.join(', ')}. Use: ${PARTS.join(', ')}`)
  return parts as Part[]
}

const run = async (argv: readonly string[]): Promise<void> => {
  const [runDir, flag, value] = argv
  if (!runDir) throw new Error('Usage: npm run scenes -w backend -- <run folder> [--parts a,b]')
  const parts = parseParts(flag === '--parts' ? value : undefined)
  const props = VideoPropsSchema.parse(JSON.parse(readFileSync(join(resolve(runDir), 'video-props.json'), 'utf8')))
  const member = props.brief.member.firstName.toLowerCase()
  const folder = createRunFolder(join(RUNS_DIR, 'scenes'), props.brief.caseId, member, new Date())
  const started = Date.now()
  const writeScenes = createScenesWriter({ runClaude: runClaudeCli, checkFrames: renderCheckFrames, parts })
  const outcome = await writeScenes(props, folder, (attempt, max) => console.log(`attempt ${attempt}/${max}…`))
  console.log(`${outcome.source} after ${outcome.attempts} attempt(s), ${((Date.now() - started) / 1000).toFixed(0)} s`)
  console.log(`output: ${folder.dir}`)
}

run(process.argv.slice(ARGS_START)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(EXIT_FAILURE)
})
