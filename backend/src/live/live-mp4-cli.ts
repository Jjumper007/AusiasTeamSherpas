/// <reference types="node" />
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { VideoPropsSchema, type VideoProps } from '@sherpas/shared'
import { loadCase } from '../brief/case-loader'
import { bundleTemplate, renderWithRemotion } from '../pipeline/render-video'
import { openRunFolder } from '../pipeline/run-folder'
import { PROPS_FILE } from '../scenes/sandbox'
import { findAdult } from '../survey/members'
import { verdictsFromLog } from './browser-verdicts'
import { liveLog, startClock } from './live-log'
import { PARTIAL_VIDEO_FILE, renderLiveMp4, RESULT_FILE, VIDEO_FILE } from './live-mp4'

/**
 * Makes the MP4 of a Live run from its folder (#17), e.g. of a run whose page closed before its render
 * ended: the same assembly, bundle and render as the live server, without Claude or the voice proxy.
 *
 *   npm run live:mp4 -w backend -- runs/daniel-emily-johnson/daniel/<timestamp>
 *
 * The render fetches the narration from the URLs in video-props.json, so the live server (`npm run live`)
 * must be running on the port they name. Scenes the page refused (as log.txt says) stay out. Ctrl+C
 * stops it and keeps nothing. Then: npm run demo:check -w backend -- <the same folder>
 */

const EXIT_FAILURE = 1
/** 128 + SIGINT, as Remotion exits on Ctrl+C. */
const EXIT_INTERRUPTED = 130
const ARGS_START = 2
const LOG_FILE = 'log.txt'
/** runs/<caseId>/<member>/<timestamp>: the run's id is its last three folders. */
const RUN_ID_PARTS = 3
const USAGE = 'Usage: npm run live:mp4 -w backend -- <Live run folder>'

const readProps = (runDir: string): VideoProps => {
  const path = resolve(runDir, PROPS_FILE)
  if (!existsSync(path)) throw new Error(`${path} is missing: is this a Live run folder past live-ready?`)
  return VideoPropsSchema.parse(JSON.parse(readFileSync(path, 'utf8')))
}

/** The render fetches the narration over HTTP: fail now, with the fix, rather than after the bundle. */
const checkNarrationServed = async (props: VideoProps): Promise<void> => {
  const url = props.scenes[0].audioFile
  if (!url) throw new Error('video-props.json has no narration for scene 1.')
  const answer = await fetch(url, { method: 'HEAD' }).catch((error: unknown) => error)
  if (answer instanceof Response && answer.ok) return
  const why = answer instanceof Response ? `HTTP ${answer.status}` : String(answer)
  throw new Error(`The narration at ${url} cannot be fetched (${why}). Start the live server on that port first: npm run live`)
}

const run = async (argv: readonly string[]): Promise<number> => {
  const [path, ...extra] = argv
  if (!path || extra.length > 0) throw new Error(USAGE)
  const runDir = resolve(process.env.INIT_CWD ?? process.cwd(), path)
  const kept = [VIDEO_FILE, RESULT_FILE].filter((file) => existsSync(resolve(runDir, file)))
  if (kept.length > 0) throw new Error(`${runDir} already has ${kept.join(' and ')}: nothing to do.`)
  const props = readProps(runDir)
  await checkNarrationServed(props)
  const runId = runDir.split(sep).slice(-RUN_ID_PARTS).join('/')
  const adult = findAdult(loadCase(props.brief.caseId), runId.split('/')[1])
  const folder = openRunFolder(runDir, runId)
  const logPath = resolve(runDir, LOG_FILE)
  const browser = verdictsFromLog(existsSync(logPath) ? readFileSync(logPath, 'utf8') : '')
  const clock = startClock(() => new Date())
  const log = liveLog(folder, clock)
  // Once Chrome runs, Remotion's own SIGINT handler closes it and exits; before that (bundling) nothing
  // would, so this exits too, after what must happen synchronously.
  process.once('SIGINT', () => {
    rmSync(folder.path(PARTIAL_VIDEO_FILE), { force: true })
    log(`render: stopped from the command line (Ctrl+C): no ${VIDEO_FILE} or ${RESULT_FILE}`)
    process.exit(EXIT_INTERRUPTED)
  })
  log('render: started from the command line (npm run live:mp4)')
  console.log(`rendering ${runId}… (Ctrl+C stops it; nothing is kept)`)
  const outcome = await renderLiveMp4(
    { folder, props, member: adult.id, partner: adult.partner, log, clock, browser },
    { renderVideo: renderWithRemotion, bundle: bundleTemplate },
  )
  console.log(`${outcome.status} after ${clock.elapsedSec().toFixed(1)} s; see ${logPath}`)
  return outcome.status === 'kept' ? 0 : EXIT_FAILURE
}

run(process.argv.slice(ARGS_START))
  .then((code) => {
    process.exitCode = code
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = EXIT_FAILURE
  })
