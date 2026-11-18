/// <reference types="node" />
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { DemoMember, DemoSite, SurveyInfo } from '../api/types'
import { surveyInfo } from '../survey/survey-info'
import { DemoFileError, demoVideoFile, listDemoPeople, readDemoReplay, readDemoResult, type DemoPerson } from './demo-folder'

/**
 * The demo site's data (`npm run demo:build`): the web app built in demo mode plays everyone in the
 * demo folder from `demo.json` and their videos, with no backend. The same folder runs locally
 * (`npm run demo`) and is what goes to the public link.
 */

export const SITE_DATA_FILE = 'demo.json'
const SITE_VIDEO_DIR = 'videos'
const ADD_HINT = 'Add one with: npm run demo:add -w backend -- <run folder>'

/** Where a member's video sits in the site, relative to its root. */
const siteVideoPath = ({ caseId, member }: DemoPerson): string => `${SITE_VIDEO_DIR}/${caseId}/${member}.mp4`

/** The demo locks the survey to the demo answers: each of them must be an answer the survey offers. */
const assertAnswersOffered = (member: DemoMember): void => {
  const { topOfMind } = member.result.survey
  if (member.survey.options.some((option) => option.id === topOfMind)) return
  throw new DemoFileError(
    `${member.survey.caseId}/${member.survey.member}: the demo video was made for the topic "${topOfMind}", which the survey does not offer.`,
  )
}

const memberOf = (demoDir: string, person: DemoPerson, describe: typeof surveyInfo): DemoMember => {
  const result = readDemoResult(demoDir, person)
  if (!result) throw new DemoFileError(`${person.caseId}/${person.member} has no demo video. ${ADD_HINT}`)
  const survey: SurveyInfo = describe(person.caseId, person.member)
  const member: DemoMember = {
    survey,
    result: { ...result, videoUrl: `/${siteVideoPath(person)}` },
    replay: readDemoReplay(demoDir, person),
  }
  assertAnswersOffered(member)
  return member
}

/** Everyone in the demo folder, checked. Throws a `DemoFileError` when there is nobody or a file is broken. */
export const buildDemoSite = (demoDir: string, describe: typeof surveyInfo = surveyInfo): DemoSite => {
  const people = listDemoPeople(demoDir)
  if (people.length === 0) throw new DemoFileError(`No demo videos in ${demoDir}. ${ADD_HINT}`)
  return { members: people.map((person) => memberOf(demoDir, person, describe)) }
}

/** Writes `demo.json` and copies the videos into `siteDir` (the built web app). Returns what it wrote. */
export const writeDemoSite = (demoDir: string, siteDir: string, describe: typeof surveyInfo = surveyInfo): DemoSite => {
  const site = buildDemoSite(demoDir, describe)
  listDemoPeople(demoDir).forEach((person) => {
    const target = join(siteDir, ...siteVideoPath(person).split('/'))
    mkdirSync(dirname(target), { recursive: true })
    copyFileSync(demoVideoFile(demoDir, person), target)
  })
  writeFileSync(join(siteDir, SITE_DATA_FILE), `${JSON.stringify(site, null, 2)}\n`)
  return site
}
