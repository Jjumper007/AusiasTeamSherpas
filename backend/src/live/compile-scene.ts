/// <reference types="node" />
import { existsSync, statSync } from 'node:fs'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { build, type Message, type Plugin } from 'esbuild'
import { HOST_PACKAGES, LIVE_HOST_KEY, templateKey } from './scene-module-contract'

/**
 * Compiles one scene file of a template copy into a browser ES module for the Live run's player
 * (contract in `scene-module-contract.ts`). Only the scene file's own code is in the output: React,
 * Remotion, `@sherpas/shared`, lucide-react and every other template module are read from the page at
 * load time. Problems (syntax, unknown imports, a missing export) are returned, never thrown.
 */

export interface CompileSceneInput {
  /** The template copy's `src/` folder, e.g. a run's `video-template/src`. */
  readonly srcDir: string
  /** The scene file, relative to `srcDir`: "scenes/WhatMattersScene.tsx". */
  readonly sceneFile: string
}

export type CompileSceneResult =
  | { readonly ok: true; readonly code: string; readonly bytes: number; readonly ms: number }
  | { readonly ok: false; readonly problems: readonly string[]; readonly ms: number }

const HOST_NAMESPACE = 'live-host'
const ENTRY_FILE = 'live-scene-entry.js'
const TARGET = 'es2022'
const SOURCE_EXTENSIONS = ['.tsx', '.ts'] as const
const SOURCE_FILE = /\.tsx?$/
/** The scene's component is named after its file, as in `src/scenes/index.ts`. */
const COMPONENT_NAME = /^[A-Z][A-Za-z0-9]*$/

const isRelative = (specifier: string): boolean => specifier.startsWith('./') || specifier.startsWith('../')
const isHostPackage = (specifier: string): boolean => (HOST_PACKAGES as readonly string[]).includes(specifier)
const toPosix = (path: string): string => path.split(sep).join('/')

/** Path of `file` under `dir`, or undefined when it is outside it. */
const pathUnder = (dir: string, file: string): string | undefined => {
  const inside = relative(dir, file)
  return inside.startsWith('..') || isAbsolute(inside) ? undefined : toPosix(inside)
}

const isFile = (path: string): boolean => existsSync(path) && statSync(path).isFile()

/** The source file a relative import points at, trying the extensions and index files TypeScript would. */
const resolveSource = (fromDir: string, specifier: string): string | undefined => {
  const base = resolve(fromDir, specifier)
  const candidates = [
    base,
    ...SOURCE_EXTENSIONS.map((extension) => `${base}${extension}`),
    ...SOURCE_EXTENSIONS.map((extension) => join(base, `index${extension}`)),
  ]
  return candidates.find(isFile)
}

/** A CommonJS stand-in for a module the page provides: esbuild turns named imports into reads of it. */
const hostShim = (key: string): string =>
  [
    `const host = globalThis[${JSON.stringify(LIVE_HOST_KEY)}]`,
    `const mod = host && host[${JSON.stringify(key)}]`,
    `if (!mod) throw new Error(${JSON.stringify(`The page does not provide "${key}" to live scenes`)})`,
    'module.exports = mod',
  ].join('\n')

const refuse = (text: string) => ({ errors: [{ text }] })

const scenePlugin = (srcDir: string, scenePath: string): Plugin => ({
  name: 'live-scene',
  setup(builder) {
    builder.onResolve({ filter: /.*/ }, (args) => {
      if (isHostPackage(args.path)) return { path: args.path, namespace: HOST_NAMESPACE }
      if (!isRelative(args.path)) return refuse(`Import "${args.path}" is not available to a live scene`)
      const file = resolveSource(args.resolveDir, args.path)
      if (!file) return refuse(`Cannot find "${args.path}"`)
      if (file === scenePath) return { path: file }
      const inSrc = pathUnder(srcDir, file)
      if (!inSrc) return refuse(`Import "${args.path}" is outside the template's src/`)
      if (!SOURCE_FILE.test(inSrc)) return refuse(`Import "${args.path}" is not a .ts or .tsx file`)
      return { path: templateKey(inSrc), namespace: HOST_NAMESPACE }
    })
    builder.onLoad({ filter: /.*/, namespace: HOST_NAMESPACE }, (args) => ({ contents: hostShim(args.path), loader: 'js' }))
  },
})

const describeMessage = (message: Message): string => {
  const where = message.location ? `${message.location.file}:${message.location.line}:${message.location.column}: ` : ''
  return `${where}${message.text}`
}

/** esbuild throws a BuildFailure with `errors`; anything else is reported by its message. */
const problemsOf = (error: unknown): string[] => {
  const errors = (error as { errors?: unknown } | null)?.errors
  if (Array.isArray(errors) && errors.length > 0) return (errors as Message[]).map(describeMessage)
  return [error instanceof Error ? error.message : String(error)]
}

/** Problems found before esbuild runs: the scene file must exist inside `src/` and be named like its component. */
const precheck = (srcDir: string, scenePath: string): string[] => {
  const inSrc = pathUnder(srcDir, scenePath)
  // Relative to src/: problems reach the browser and the run log, server paths do not.
  if (!inSrc) return ["The scene file must be inside the template's src/"]
  if (!isFile(scenePath)) return [`Scene file not found: ${inSrc}`]
  const name = basename(scenePath).replace(SOURCE_FILE, '')
  return COMPONENT_NAME.test(name) ? [] : [`The scene file name must be its component's name, got "${name}"`]
}

export const compileScene = async (input: CompileSceneInput): Promise<CompileSceneResult> => {
  const started = performance.now()
  const elapsed = (): number => performance.now() - started
  const srcDir = resolve(input.srcDir)
  const scenePath = resolve(srcDir, input.sceneFile)
  const early = precheck(srcDir, scenePath)
  if (early.length > 0) return { ok: false, problems: early, ms: elapsed() }

  const component = basename(scenePath).replace(SOURCE_FILE, '')
  try {
    const result = await build({
      stdin: {
        contents: `export { ${component} as default } from ${JSON.stringify(`./${basename(scenePath)}`)}`,
        resolveDir: dirname(scenePath),
        sourcefile: ENTRY_FILE,
        // JavaScript, not TypeScript: a TS re-export of a missing name passes silently as a type.
        loader: 'js',
      },
      absWorkingDir: srcDir,
      bundle: true,
      write: false,
      format: 'esm',
      platform: 'browser',
      target: TARGET,
      jsx: 'automatic',
      minify: true,
      legalComments: 'none',
      charset: 'utf8',
      logLevel: 'silent',
      tsconfigRaw: '{}',
      define: { 'process.env.NODE_ENV': '"production"' },
      plugins: [scenePlugin(srcDir, scenePath)],
    })
    const code = result.outputFiles[0]?.text ?? ''
    return { ok: true, code, bytes: Buffer.byteLength(code), ms: elapsed() }
  } catch (error) {
    return { ok: false, problems: problemsOf(error), ms: elapsed() }
  }
}
