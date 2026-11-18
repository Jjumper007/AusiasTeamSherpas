/// <reference types="node" />
import { rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { emilyRun, removeTempDirs, tempDir, writeRunFolder } from './demo-run.test-helper'
import { verifyRunFolder } from './run-files'

const run = emilyRun()
const runFolder = (data = run): string => writeRunFolder(join(tempDir('run'), 'run'), data)

afterAll(removeTempDirs)

describe('verifyRunFolder', () => {
  it('passes a good run and says whose demo video it is', () => {
    const report = verifyRunFolder(runFolder())

    expect(report.problems).toEqual([])
    expect(report.person).toEqual({ caseId: 'daniel-emily-johnson', member: 'emily' })
  })

  it('names every missing file', () => {
    const dir = runFolder()
    rmSync(join(dir, 'video.mp4'))
    rmSync(join(dir, 'survey.json'))

    expect(verifyRunFolder(dir).problems).toEqual(['survey.json is missing.', 'video.mp4 is missing.'])
  })

  it('reports a file that is not valid JSON or not in the expected shape', () => {
    const dir = runFolder()
    writeFileSync(join(dir, 'video-props.json'), '{')
    writeFileSync(join(dir, 'survey.json'), JSON.stringify({ nickname: 'Em' }))

    const { problems } = verifyRunFolder(dir)

    expect(problems).toContain('video-props.json is not valid JSON.')
    expect(problems.some((problem) => problem.startsWith('survey.json is not valid: explainLevel'))).toBe(true)
  })

  it('reports a member who is not an adult of the case', () => {
    const dir = runFolder({ ...run, result: { ...run.result, member: 'oliver' } })

    expect(verifyRunFolder(dir).problems).toEqual([expect.stringContaining('No adult "oliver"')])
  })

  it("checks the scene code of a sandbox the video was rendered from", () => {
    const sceneSources = new Map([['src/components/Big.tsx', 'export const Big = () => <b>$4,500,000</b>\n']])
    const dir = runFolder({ ...run, sceneSources, log: "[render] video.mp4 written with Claude's scenes\n" })

    expect(verifyRunFolder(dir).problems).toEqual([expect.stringMatching(/^Scene code: src\/components\/Big\.tsx/)])
  })

  it('reports a path that is not a folder', () => {
    expect(verifyRunFolder(join(tempDir('run'), 'missing')).problems).toEqual([expect.stringContaining('is not a folder')])
  })
})
