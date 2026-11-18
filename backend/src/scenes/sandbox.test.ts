/// <reference types="node" />
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { videoPropsFixture } from '@sherpas/shared'
import { afterEach, describe, expect, it } from 'vitest'
import { VIDEO_TEMPLATE_DIR } from '../paths'
import {
  changedSources,
  createSandbox,
  editablePredicate,
  editableSources,
  listFiles,
  lockedProblems,
  restoreEditableSources,
  restoreLocked,
  snapshotLocked,
} from './sandbox'

const TARGET = 'src/scenes/WhatMattersScene.tsx'
const dirs: string[] = []

const newSandbox = (): string => {
  const dir = join(mkdtempSync(join(tmpdir(), 'sherpas-sandbox-')), 'video-template')
  dirs.push(dir)
  createSandbox(VIDEO_TEMPLATE_DIR, dir, videoPropsFixture)
  return dir
}

afterEach(() => dirs.splice(0).forEach((dir) => rmSync(join(dir, '..'), { recursive: true, force: true })))

describe('createSandbox', () => {
  it('copies the sources without tests, a standalone tsconfig and the props, and no package.json', () => {
    const dir = newSandbox()
    const files = listFiles(dir)
    expect(files).toContain(TARGET)
    expect(files).toContain('src/locked/Root.tsx')
    expect(files.filter((file) => file.endsWith('.test.ts'))).toEqual([])
    expect(files).not.toContain('package.json')
    const tsconfig = JSON.parse(readFileSync(join(dir, 'tsconfig.json'), 'utf8'))
    expect(tsconfig.extends).toBeUndefined()
    expect(tsconfig.compilerOptions).toMatchObject({ strict: true, noEmit: true, jsx: 'react-jsx' })
    expect(JSON.parse(readFileSync(join(dir, 'video-props.json'), 'utf8'))).toEqual(videoPropsFixture)
  })
})

describe('locked files', () => {
  it('only the target scenes and components are editable', () => {
    const isEditable = editablePredicate([TARGET])
    expect(isEditable(TARGET)).toBe(true)
    expect(isEditable('src/components/NewChart.tsx')).toBe(true)
    expect(isEditable('src/scenes/HookScene.tsx')).toBe(false)
    expect(isEditable('src/locked/tokens.ts')).toBe(false)
    expect(isEditable('tsconfig.json')).toBe(false)
  })

  it('reports nothing when only editable files change', () => {
    const dir = newSandbox()
    const snapshot = snapshotLocked(dir, editablePredicate([TARGET]))
    writeFileSync(join(dir, TARGET), 'export const changed = true\n')
    writeFileSync(join(dir, 'src/components/NewChart.tsx'), 'export {}\n')
    expect(lockedProblems(dir, snapshot)).toEqual([])
  })

  it('reports changed, deleted and added locked files, and restores them', () => {
    const dir = newSandbox()
    const snapshot = snapshotLocked(dir, editablePredicate([TARGET]))
    const tokens = readFileSync(join(dir, 'src/locked/tokens.ts'), 'utf8')
    writeFileSync(join(dir, 'src/locked/tokens.ts'), `${tokens}\nexport const HACK = 1\n`)
    rmSync(join(dir, 'src/scenes/types.ts'))
    writeFileSync(join(dir, 'notes.md'), 'scratch')

    expect(lockedProblems(dir, snapshot)).toEqual([
      expect.stringContaining('src/locked/tokens.ts was changed'),
      expect.stringContaining('src/scenes/types.ts was deleted'),
      expect.stringContaining('notes.md was created'),
    ])
    restoreLocked(dir, snapshot)
    expect(lockedProblems(dir, snapshot)).toEqual([])
    expect(readFileSync(join(dir, 'src/locked/tokens.ts'), 'utf8')).toBe(tokens)
    expect(existsSync(join(dir, 'notes.md'))).toBe(false)
  })

  it('lists the editable sources with their content', () => {
    const dir = newSandbox()
    const sources = editableSources(dir, editablePredicate([TARGET]))
    expect(sources.get(TARGET)).toContain('WhatMattersScene')
    expect([...sources.keys()].every((key) => key === TARGET || key.startsWith('src/components/'))).toBe(true)
  })

  it('puts the editable sources back as saved, removing new ones and keeping locked files', () => {
    const dir = newSandbox()
    const isEditable = editablePredicate([TARGET])
    const saved = editableSources(dir, isEditable)
    const tokens = readFileSync(join(dir, 'src/locked/tokens.ts'), 'utf8')
    writeFileSync(join(dir, TARGET), 'export const WhatMattersScene = () => null\n')
    writeFileSync(join(dir, 'src/components/Extra.tsx'), 'export const Extra = () => null\n')

    expect(changedSources(saved, editableSources(dir, isEditable))).toEqual(['src/components/Extra.tsx', TARGET])
    restoreEditableSources(dir, isEditable, saved)

    expect(changedSources(saved, editableSources(dir, isEditable))).toEqual([])
    expect(existsSync(join(dir, 'src/components/Extra.tsx'))).toBe(false)
    expect(readFileSync(join(dir, 'src/locked/tokens.ts'), 'utf8')).toBe(tokens)
  })
})
