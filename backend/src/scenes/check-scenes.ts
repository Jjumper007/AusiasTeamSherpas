/// <reference types="node" />
import { execFile } from 'node:child_process'
import { join } from 'node:path'
import { validateTsx, type Facts, type VideoProps } from '@sherpas/shared'
import { ROOT_DIR } from '../paths'

/**
 * The deterministic validators of Claude's scenes (SPEC §5.5): TypeScript, the number guard and the
 * video's length. Rendering the check frames lives in `render-video.ts` (it needs Chrome). Every
 * problem is a sentence that goes back to Claude in the retry.
 */

export const MIN_VIDEO_SEC = 60
export const MAX_VIDEO_SEC = 120
/** The video's frame rate (`VIDEO.fps` in `video-template/src/locked/tokens.ts`). */
export const FPS = 30
/** Check frames sit this far into each scene, once its entrances have played. */
const CHECK_FRAME_SHARE = 0.6
const TSC_TIMEOUT_MS = 60_000
const MAX_TSC_LINES = 20
/** The repo's TypeScript, so the sandbox never resolves (or downloads) another one. */
const TSC_BIN = join(ROOT_DIR, 'node_modules', '.bin', 'tsc')

/** One frame per scene, 60% into it: what the five check stills show. */
export const checkFrames = (timings: VideoProps['scenes'], fps = FPS): number[] =>
  timings.map((timing, index) => {
    const start = timings.slice(0, index).reduce((sum, previous) => sum + previous.durationSec, 0)
    return Math.round((start + timing.durationSec * CHECK_FRAME_SHARE) * fps)
  })

export const durationProblems = (durationSec: number): string[] =>
  durationSec < MIN_VIDEO_SEC || durationSec > MAX_VIDEO_SEC
    ? [`The video lasts ${durationSec.toFixed(1)} s; it must last between ${MIN_VIDEO_SEC} and ${MAX_VIDEO_SEC} s.`]
    : []

/** The number guard over every editable source file: figures must come from facts through `fmt`. */
export const numberGuardProblems = (sources: ReadonlyMap<string, string>, facts: Facts): string[] =>
  [...sources].flatMap(([file, source]) =>
    validateTsx(source, facts).errors.map((error) => `${file}: ${error.message}`),
  )

/** `tsc` prints "src/x.tsx(3,5): error TS…" lines; keep the first few, they are what Claude needs. */
export const tscProblems = (output: string): string[] => {
  const errors = output.split('\n').filter((line) => /error TS\d+/.test(line))
  const shown = errors.slice(0, MAX_TSC_LINES).map((line) => `TypeScript: ${line.trim()}`)
  const hidden = errors.length - shown.length
  return hidden > 0 ? [...shown, `TypeScript: … and ${hidden} more errors.`] : shown
}

/** Type-checks the sandbox with the repo's TypeScript (`tsc -p tsconfig.json`, which has noEmit). */
export const runTsc = (sandboxDir: string): Promise<string[]> =>
  new Promise((resolve) => {
    execFile(TSC_BIN, ['-p', 'tsconfig.json'], { cwd: sandboxDir, timeout: TSC_TIMEOUT_MS }, (error, stdout, stderr) => {
      if (!error) return resolve([])
      const problems = tscProblems(`${stdout}\n${stderr}`)
      resolve(problems.length > 0 ? problems : [`TypeScript failed: ${error.message.split('\n')[0]}`])
    })
  })
