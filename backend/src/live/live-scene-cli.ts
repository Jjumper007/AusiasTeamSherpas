/// <reference types="node" />
import { runClaudeCli } from '../script/claude-cli'
import { describeTry, parseLiveSceneArgs, tryLiveScenes } from './live-scene-try'

/**
 * Runs the Live run's scene step (#15) on an existing run, with real `claude -p` calls, to iterate on
 * prompts/live-scene.md without the voice proxy or a browser:
 *
 *   npm run live:scene -w backend -- runs/daniel-emily-johnson/daniel/<timestamp> [--parts what_matters,first_step] [--effort low] [--model sonnet] [--limit 40]
 *
 * A relative run folder is read from where npm was started. Prints, per part: seconds to the answer,
 * characters, each check, the module size or the reason it failed. Files in <run>/live-scene-tries/.
 */

const EXIT_FAILURE = 1
const ARGS_START = 2

const run = async (argv: readonly string[]): Promise<void> => {
  const options = parseLiveSceneArgs(argv, process.env.INIT_CWD ?? process.cwd())
  const started = Date.now()
  console.log(`designing ${options.parts.join(', ')} in parallel…`)
  const { folder, results } = await tryLiveScenes(options, { runClaude: runClaudeCli })
  results.forEach((result) => console.log(describeTry(result).join('\n')))
  console.log(`${results.filter((result) => result.status === 'ready').length} of ${results.length} ready, ${((Date.now() - started) / 1000).toFixed(1)} s`)
  console.log(`output: ${folder.dir}`)
}

run(process.argv.slice(ARGS_START)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(EXIT_FAILURE)
})
