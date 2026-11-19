/// <reference types="node" />
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { PARTS } from '@sherpas/shared'
import { afterEach, describe, expect, it } from 'vitest'
import { VIDEO_TEMPLATE_DIR } from '../paths'
import { compileScene } from './compile-scene'
import { LIVE_HOST_KEY, sceneComponentName, sceneFileOf } from './scene-module-contract'

const SCENE = 'scenes/TestScene.tsx'
const dirs: string[] = []

/** A template `src/` in a temp folder with the given files. */
const newSrc = (files: Readonly<Record<string, string>>): string => {
  const root = mkdtempSync(join(tmpdir(), 'sherpas-live-scene-'))
  dirs.push(root)
  const src = join(root, 'src')
  Object.entries(files).forEach(([path, content]) => {
    mkdirSync(dirname(join(src, path)), { recursive: true })
    writeFileSync(join(src, path), content)
  })
  return src
}

afterEach(() => dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })))

const GOOD_SCENE = `
import { fmt } from '@sherpas/shared'
import { Flag } from 'lucide-react'
import type { FC } from 'react'
import { useCurrentFrame } from 'remotion'
import { Label } from '../components/Label'
import type { SceneProps } from './types'

export const TestScene: FC<SceneProps> = ({ title }) => {
  const frame = useCurrentFrame()
  return (
    <div>
      <Label text={fmt.upper(title)} />
      <Flag size={frame} />
    </div>
  )
}
`

const TEMPLATE_FILES = {
  'components/Label.tsx': 'export const Label = () => null\n',
  'scenes/types.ts': 'export interface SceneProps { readonly title: string }\n',
}

interface FakeElement {
  readonly type: unknown
  readonly props: Record<string, unknown>
}

/** Fake page instances, recording which keys the module reads. */
const fakeHost = (read: string[]) => {
  const element = (type: unknown, props: Record<string, unknown>): FakeElement => ({ type, props })
  const modules: Record<string, unknown> = {
    'react/jsx-runtime': { jsx: element, jsxs: element, Fragment: 'fragment' },
    remotion: { useCurrentFrame: () => 42 },
    '@sherpas/shared': { fmt: { upper: (text: string) => text.toUpperCase() } },
    'lucide-react': { Flag: 'the page Flag' },
    'template/components/Label': { Label: 'the page Label' },
  }
  return new Proxy(modules, {
    get: (target, key: string) => {
      read.push(key)
      return target[key]
    },
  })
}

const importCompiled = async (code: string, dir: string): Promise<Record<string, unknown>> => {
  const file = join(dir, 'compiled.mjs')
  writeFileSync(file, code)
  return (await import(pathToFileURL(file).href)) as Record<string, unknown>
}

describe('compileScene', () => {
  it('builds a module whose default export is the scene, reading React, Remotion, shared, icons and the template from the page', async () => {
    const src = newSrc({ ...TEMPLATE_FILES, [SCENE]: GOOD_SCENE })
    const result = await compileScene({ srcDir: src, sceneFile: SCENE })
    if (!result.ok) throw new Error(result.problems.join('\n'))
    expect(result.code).toContain(LIVE_HOST_KEY)
    // No copy of React or Remotion inside: only their host keys.
    expect(result.code).not.toMatch(/__CLIENT_INTERNALS|ReactSharedInternals|useCurrentFrame\s*=\s*\(\)\s*=>/)
    expect(result.bytes).toBe(Buffer.byteLength(result.code))

    const read: string[] = []
    const globals = globalThis as Record<string, unknown>
    globals[LIVE_HOST_KEY] = fakeHost(read)
    try {
      const module = await importCompiled(result.code, dirname(src))
      const Scene = module.default as (props: { title: string }) => FakeElement
      const tree = Scene({ title: 'plan' })
      const [label, icon] = tree.props.children as FakeElement[]
      expect(label).toMatchObject({ type: 'the page Label', props: { text: 'PLAN' } })
      expect(icon).toMatchObject({ type: 'the page Flag', props: { size: 42 } })
      // `import type` lines (react, ./types) leave nothing to read.
      expect([...new Set(read)].sort()).toEqual(
        ['@sherpas/shared', 'lucide-react', 'react/jsx-runtime', 'remotion', 'template/components/Label'].sort(),
      )
    } finally {
      delete globals[LIVE_HOST_KEY]
    }
  })

  it('reports a syntax error with its file and line instead of throwing', async () => {
    const src = newSrc({ ...TEMPLATE_FILES, [SCENE]: 'export const TestScene = () => <div>\n' })
    const result = await compileScene({ srcDir: src, sceneFile: SCENE })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.problems[0]).toMatch(/^scenes\/TestScene\.tsx:\d+:\d+: /)
  })

  it('refuses packages the page does not provide', async () => {
    const src = newSrc({ [SCENE]: "import pad from 'left-pad'\nexport const TestScene = () => pad\n" })
    const result = await compileScene({ srcDir: src, sceneFile: SCENE })
    expect(result).toMatchObject({ ok: false, problems: [expect.stringContaining('Import "left-pad" is not available')] })
  })

  it('refuses imports outside the template src/', async () => {
    const src = newSrc({ [SCENE]: "import { secret } from '../../secret'\nexport const TestScene = () => secret\n" })
    writeFileSync(join(src, '..', 'secret.ts'), 'export const secret = 1\n')
    const result = await compileScene({ srcDir: src, sceneFile: SCENE })
    expect(result).toMatchObject({ ok: false, problems: [expect.stringContaining('outside the template')] })
  })

  it('reports a scene that does not export the component named after its file', async () => {
    const src = newSrc({ [SCENE]: 'export const OtherScene = () => null\n' })
    const result = await compileScene({ srcDir: src, sceneFile: SCENE })
    expect(result).toMatchObject({ ok: false, problems: [expect.stringContaining('TestScene')] })
  })

  it('reports a missing scene file and a file outside src/', async () => {
    const src = newSrc({})
    expect(await compileScene({ srcDir: src, sceneFile: SCENE })).toMatchObject({ ok: false })
    expect(await compileScene({ srcDir: src, sceneFile: '../outside/TestScene.tsx' })).toMatchObject({
      ok: false,
      problems: [expect.stringContaining('must be inside')],
    })
  })

  it('compiles every Standard scene of the template', async () => {
    const results = await Promise.all(
      PARTS.map((part) => compileScene({ srcDir: join(VIDEO_TEMPLATE_DIR, 'src'), sceneFile: sceneFileOf(part) })),
    )
    expect(results.map((result) => (result.ok ? 'ok' : result.problems.join('; ')))).toEqual(PARTS.map(() => 'ok'))
  })
})

describe('scene module contract', () => {
  it('names each part the way the template does', () => {
    expect(sceneComponentName('what_matters')).toBe('WhatMattersScene')
    expect(sceneComponentName('where_you_are')).toBe('WhereYouAreScene')
    PARTS.forEach((part) => expect(existsSync(join(VIDEO_TEMPLATE_DIR, 'src', sceneFileOf(part)))).toBe(true))
  })
})
