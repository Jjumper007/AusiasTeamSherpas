/// <reference types="node" />
import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import type { VideoProps } from '@sherpas/shared'

/**
 * The isolated copy of `video-template/` that Claude edits in one run (SPEC §5.4). It lives in the
 * run folder, inside the repo, so its imports resolve from the root `node_modules` like the
 * template's. It has no `package.json` of its own: `npx tsc` must resolve the repo's TypeScript.
 */

export const SANDBOX_DIR = 'video-template'
export const PROPS_FILE = 'video-props.json'
const TSCONFIG_FILE = 'tsconfig.json'
const SOURCE_DIR = 'src'
/** Unit tests are not part of the video and would only slow down Claude's type check. */
const TEST_FILE = /\.test\.tsx?$/
/** New building blocks may be added here; everything else outside the target scenes is locked. */
const EDITABLE_DIR = 'src/components/'
const SOURCE_FILE = /\.tsx?$/

/** Path relative to the sandbox, always with forward slashes. */
const toKey = (root: string, file: string): string => relative(root, file).split(sep).join('/')

/** Every file under `dir`, as sandbox-relative keys, sorted. */
export const listFiles = (root: string, dir = root): string[] =>
  readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(dir, entry.name)
      return entry.isDirectory() ? listFiles(root, path) : [toKey(root, path)]
    })
    .sort()

interface TsConfig {
  readonly extends?: string
  readonly compilerOptions?: Record<string, unknown>
}

/** The template's `tsconfig.json` with its `extends` inlined: the relative base path breaks in a copy. */
export const standaloneTsconfig = (templateDir: string): string => {
  const own = JSON.parse(readFileSync(join(templateDir, TSCONFIG_FILE), 'utf8')) as TsConfig
  const base: TsConfig = own.extends ? JSON.parse(readFileSync(join(templateDir, own.extends), 'utf8')) : {}
  const { extends: _inlined, ...rest } = own
  const merged = { ...rest, compilerOptions: { ...base.compilerOptions, ...own.compilerOptions } }
  return `${JSON.stringify(merged, null, 2)}\n`
}

/** Copies the template's sources and a standalone tsconfig to `sandboxDir`, with the run's props. */
export const createSandbox = (templateDir: string, sandboxDir: string, props: VideoProps): void => {
  rmSync(sandboxDir, { recursive: true, force: true })
  mkdirSync(sandboxDir, { recursive: true })
  cpSync(join(templateDir, SOURCE_DIR), join(sandboxDir, SOURCE_DIR), {
    recursive: true,
    filter: (source) => !TEST_FILE.test(source),
  })
  writeFileSync(join(sandboxDir, TSCONFIG_FILE), standaloneTsconfig(templateDir))
  writeFileSync(join(sandboxDir, PROPS_FILE), `${JSON.stringify(props, null, 2)}\n`)
}

/** Which files Claude may change in an attempt: the target scene files and anything in components. */
export const editablePredicate =
  (targetFiles: readonly string[]) =>
  (key: string): boolean =>
    targetFiles.includes(key) || key.startsWith(EDITABLE_DIR)

const sha256 = (content: Buffer): string => createHash('sha256').update(content).digest('hex')

/** The locked files of a sandbox, with their content, to check and restore them after each attempt. */
export interface LockedSnapshot {
  readonly files: ReadonlyMap<string, { readonly hash: string; readonly content: Buffer }>
  readonly isEditable: (key: string) => boolean
}

export const snapshotLocked = (sandboxDir: string, isEditable: (key: string) => boolean): LockedSnapshot => {
  const files = new Map(
    listFiles(sandboxDir)
      .filter((key) => !isEditable(key))
      .map((key) => {
        const content = readFileSync(join(sandboxDir, key))
        return [key, { hash: sha256(content), content }] as const
      }),
  )
  return { files, isEditable }
}

/** Locked files that were changed, deleted or added since the snapshot, as messages for Claude. */
export const lockedProblems = (sandboxDir: string, snapshot: LockedSnapshot): string[] => {
  const changed = [...snapshot.files].flatMap(([key, { hash }]) => {
    const path = join(sandboxDir, key)
    if (!existsSync(path)) return [`Locked file ${key} was deleted; it has been restored. Do not touch it.`]
    return sha256(readFileSync(path)) === hash ? [] : [`Locked file ${key} was changed; it has been restored. Do not edit it.`]
  })
  const added = listFiles(sandboxDir)
    .filter((key) => !snapshot.isEditable(key) && !snapshot.files.has(key))
    .map((key) => `File ${key} was created outside the files you may edit; it has been removed.`)
  return [...changed, ...added]
}

/** Puts every locked file back as it was and removes files created outside the editable ones. */
export const restoreLocked = (sandboxDir: string, snapshot: LockedSnapshot): void => {
  listFiles(sandboxDir)
    .filter((key) => !snapshot.isEditable(key) && !snapshot.files.has(key))
    .forEach((key) => rmSync(join(sandboxDir, key), { force: true }))
  snapshot.files.forEach(({ content }, key) => {
    const path = join(sandboxDir, key)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, content)
  })
}

/** Editable source files (`.ts`/`.tsx`) as they are now, keyed by sandbox path. */
export const editableSources = (sandboxDir: string, isEditable: (key: string) => boolean): Map<string, string> =>
  new Map(
    listFiles(sandboxDir)
      .filter((key) => isEditable(key) && SOURCE_FILE.test(key))
      .map((key) => [key, readFileSync(join(sandboxDir, key), 'utf8')] as const),
  )

/** Editable source files that differ between two `editableSources` readings: changed, added or deleted. */
export const changedSources = (before: ReadonlyMap<string, string>, after: ReadonlyMap<string, string>): string[] =>
  [...new Set([...before.keys(), ...after.keys()])].filter((key) => before.get(key) !== after.get(key)).sort()

/**
 * Puts the editable sources back to a saved `editableSources` reading (#10: a visual fix that broke
 * a validator): rewrites the saved files and removes editable sources created since.
 */
export const restoreEditableSources = (
  sandboxDir: string,
  isEditable: (key: string) => boolean,
  saved: ReadonlyMap<string, string>,
): void => {
  editableSources(sandboxDir, isEditable).forEach((_, key) => {
    if (!saved.has(key)) rmSync(join(sandboxDir, key), { force: true })
  })
  saved.forEach((content, key) => {
    const path = join(sandboxDir, key)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, content)
  })
}
