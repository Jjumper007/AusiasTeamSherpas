/// <reference types="node" />
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import type { DemoSite } from '../api/types'
import { addToDemo, DemoFileError } from './demo-folder'
import { emilyRun, removeTempDirs, tempDir, writeRunFolder } from './demo-run.test-helper'
import { buildDemoSite, writeDemoSite } from './demo-site'

const emily = { caseId: 'daniel-emily-johnson', member: 'emily' }
const run = emilyRun()

const demoWithEmily = (): string => {
  const demoDir = tempDir('demo')
  addToDemo(demoDir, emily, writeRunFolder(join(tempDir('run'), 'run'), run))
  return demoDir
}

afterAll(removeTempDirs)

describe('buildDemoSite', () => {
  it("gives each member's survey, demo video and run replay, with the video at its place in the site", () => {
    const [member, ...others] = buildDemoSite(demoWithEmily()).members

    expect(others).toEqual([])
    expect(member.survey).toMatchObject({ caseId: emily.caseId, member: 'emily', name: 'Emily', partner: 'Daniel' })
    expect(member.result.survey).toEqual(run.survey)
    expect(member.result.videoUrl).toBe('/videos/daniel-emily-johnson/emily.mp4')
    expect(member.replay.map((step) => step.step)).toEqual(['brief', 'script', 'voice', 'scenes', 'render'])
  })

  it('refuses an empty demo folder, saying how to add a video', () => {
    expect(() => buildDemoSite(tempDir('demo'))).toThrow(/npm run demo:add/)
  })

  it("refuses a demo video whose topic is not one the member's survey offers", () => {
    const demoDir = demoWithEmily()
    const file = join(demoDir, emily.caseId, emily.member, 'result.json')
    writeFileSync(file, JSON.stringify({ ...run.result, survey: { ...run.survey, topOfMind: 'home_purchase' } }))

    expect(() => buildDemoSite(demoDir)).toThrow(DemoFileError)
  })
})

describe('writeDemoSite', () => {
  it('writes demo.json and copies each video where demo.json says it is', () => {
    const siteDir = join(tempDir('site'), 'demo-site')

    const site = writeDemoSite(demoWithEmily(), siteDir)

    const written = JSON.parse(readFileSync(join(siteDir, 'demo.json'), 'utf8')) as DemoSite
    expect(written).toEqual(site)
    const video = join(siteDir, ...site.members[0].result.videoUrl.split('/'))
    expect(existsSync(video)).toBe(true)
  })
})
