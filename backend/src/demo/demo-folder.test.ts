/// <reference types="node" />
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { emilyRun, removeTempDirs, tempDir, writeRunFolder } from './demo-run.test-helper'
import { addToDemo, DemoFileError, isSlug, listDemoPeople, readDemoResult } from './demo-folder'

const emily = { caseId: 'daniel-emily-johnson', member: 'emily' }
const run = emilyRun()

/** A demo folder with Emily's video added from a run folder. */
const demoWithEmily = (): string => {
  const demoDir = tempDir('demo')
  addToDemo(demoDir, emily, writeRunFolder(join(tempDir('run'), 'run'), run))
  return demoDir
}

afterAll(removeTempDirs)

describe('isSlug', () => {
  it.each(['daniel-emily-johnson', 'emily', 'case2'])('accepts %s', (value) => {
    expect(isSlug(value)).toBe(true)
  })

  it.each(['', '..', '../etc', 'a/b', 'Emily', 'a--b', '-a', 'a.json', 'a'.repeat(65)])('rejects %j', (value) => {
    expect(isSlug(value)).toBe(false)
  })
})

describe('addToDemo and listDemoPeople', () => {
  it('copies result.json and video.mp4 and lists the person', () => {
    const demoDir = demoWithEmily()

    expect(listDemoPeople(demoDir)).toEqual([emily])
    expect(readdirSync(join(demoDir, emily.caseId, emily.member)).sort()).toEqual(['result.json', 'video.mp4'])
  })

  it("replaces the person's earlier demo files", () => {
    const demoDir = demoWithEmily()
    const newer = writeRunFolder(join(tempDir('run'), 'run'), { ...run, result: { ...run.result, name: 'Emmy' } })

    addToDemo(demoDir, emily, newer)

    expect(readDemoResult(demoDir, emily)?.name).toBe('Emmy')
  })

  it('lists nobody for a missing folder', () => {
    expect(listDemoPeople(join(tempDir('demo'), 'missing'))).toEqual([])
  })

  it('skips people with only one of the two files and folders that are not slugs', () => {
    const demoDir = demoWithEmily()
    mkdirSync(join(demoDir, emily.caseId, 'daniel'))
    writeFileSync(join(demoDir, emily.caseId, 'daniel', 'video.mp4'), 'x')
    mkdirSync(join(demoDir, 'Not A Slug', 'emily'), { recursive: true })

    expect(listDemoPeople(demoDir)).toEqual([emily])
  })

  it('refuses ids that are not slugs', () => {
    expect(() => addToDemo(tempDir('demo'), { caseId: '..', member: 'emily' }, tempDir('run'))).toThrow(DemoFileError)
  })
})

describe('readDemoResult', () => {
  it('gives the result with the video in the demo folder', () => {
    const result = readDemoResult(demoWithEmily(), emily)

    expect(result).toMatchObject({ member: 'emily', partner: 'Daniel', chapters: run.result.chapters })
    expect(result?.videoUrl).toBe('/demo/daniel-emily-johnson/emily/video.mp4')
  })

  it('gives null for someone without a demo video', () => {
    expect(readDemoResult(demoWithEmily(), { ...emily, member: 'daniel' })).toBeNull()
  })

  it('reads an older result without the first-step figures as null figures', () => {
    const demoDir = demoWithEmily()
    const { firstStepScore: _score, waitGap: _gap, ...older } = run.result
    writeFileSync(join(demoDir, emily.caseId, emily.member, 'result.json'), JSON.stringify(older))

    expect(readDemoResult(demoDir, emily)).toMatchObject({ firstStepScore: null, waitGap: null })
  })

  it('throws a DemoFileError for a file that is not JSON or not a result', () => {
    const demoDir = demoWithEmily()
    const file = join(demoDir, emily.caseId, emily.member, 'result.json')
    writeFileSync(file, '{')
    expect(() => readDemoResult(demoDir, emily)).toThrow(/not valid JSON/)
    writeFileSync(file, JSON.stringify({ ...run.result, chapters: 'none' }))
    expect(() => readDemoResult(demoDir, emily)).toThrow(/chapters/)
  })

  it('never reads outside the demo folder', () => {
    expect(() => readDemoResult(demoWithEmily(), { caseId: '..', member: 'emily' })).toThrow(DemoFileError)
  })

  it('keeps the copied result.json as the run wrote it', () => {
    const demoDir = demoWithEmily()
    const copied = JSON.parse(readFileSync(join(demoDir, emily.caseId, emily.member, 'result.json'), 'utf8'))

    expect(copied.videoUrl).toBe(run.result.videoUrl)
  })
})
