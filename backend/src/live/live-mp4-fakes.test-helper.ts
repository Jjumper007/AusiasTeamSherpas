/// <reference types="node" />
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Part, VideoProps } from '@sherpas/shared'
import { VIDEO_TEMPLATE_DIR } from '../paths'
import type { RenderOptions, RenderVideo } from '../pipeline/render-video'
import type { RunClaude } from '../script/claude-cli'
import type { SceneStepDeps } from './live-scene-step'
import { sceneFileOf } from './scene-module-contract'

/** Fakes for the background MP4's tests (#17): Claude's scenes, the bundle and the render, without Chrome. */

const PART_IN_PROMPT = /part \d of 5, `(\w+)`/

/** The Standard scene of a part, marked as Claude's: it passes every check. */
export const claudeSource = (part: Part): string =>
  `${readFileSync(join(VIDEO_TEMPLATE_DIR, 'src', sceneFileOf(part)), 'utf8')}\n// Designed by Claude for ${part}\n`

/** Claude's scenes for parts 3–5: every part accepted, except those in `empty` (an empty answer: Standard scene). */
export const sceneStep = (empty: readonly Part[] = []): SceneStepDeps => {
  const runClaude: RunClaude = async (prompt) => {
    const part = PART_IN_PROMPT.exec(prompt)?.[1] as Part
    return empty.includes(part) ? '' : claudeSource(part)
  }
  return { runClaude, typecheck: async () => [] }
}

/** What one render call does: finish, fail, or wait until it is cancelled. */
export type RenderPlan = 'finish' | 'fail' | 'until-cancelled'

export interface RenderCall {
  readonly props: VideoProps
  readonly outputFile: string
  readonly options?: RenderOptions
}

/**
 * A render that writes a partial file first, like Remotion, then follows `plans` call by call (the last
 * one repeats). A cancelled render rejects as soon as its signal aborts.
 */
export const fakeRender = (plans: readonly RenderPlan[] = ['finish']) => {
  const calls: RenderCall[] = []
  let started: (call: RenderCall) => void = () => undefined
  let next = new Promise<RenderCall>((resolve) => {
    started = resolve
  })
  const renderVideo: RenderVideo = async (props, outputFile, _onProgress, options) => {
    const call = { props, outputFile, options }
    calls.push(call)
    const plan = plans[Math.min(calls.length, plans.length) - 1]
    writeFileSync(outputFile, 'partial mp4')
    started(call)
    next = new Promise<RenderCall>((resolve) => {
      started = resolve
    })
    await Promise.resolve()
    if (plan === 'fail') throw new Error('Chrome crashed')
    if (plan === 'until-cancelled') await cancelled(options?.signal)
    writeFileSync(outputFile, 'complete mp4')
  }
  /** Resolves with the next render call once it has started. */
  const nextStart = (): Promise<RenderCall> => next
  return { renderVideo, calls, nextStart }
}

const cancelled = (signal: AbortSignal | undefined): Promise<never> =>
  new Promise((_, reject) => {
    if (!signal) return
    const fail = (): void => reject(new Error('renderMedia() got cancelled'))
    if (signal.aborted) fail()
    else signal.addEventListener('abort', fail, { once: true })
  })

/** A bundle that resolves at once, or when `release()` is called if `held`. */
export const fakeBundle = (options: { readonly held?: boolean } = {}) => {
  const calls: string[] = []
  let release: () => void = () => undefined
  const gate = options.held
    ? new Promise<void>((resolve) => {
        release = resolve
      })
    : Promise.resolve()
  let started: () => void = () => undefined
  const start = new Promise<void>((resolve) => {
    started = resolve
  })
  const bundle = async (templateDir: string): Promise<string> => {
    calls.push(templateDir)
    started()
    await gate
    return `bundle:${templateDir}`
  }
  return { bundle, calls, release: () => release(), started: start }
}
