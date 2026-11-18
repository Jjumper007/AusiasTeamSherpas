/// <reference types="node" />
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Survey, VideoProps } from '@sherpas/shared'
import { buildJobResult } from '../pipeline/job-result'
import { buildFallbackScript } from '../script/fallback-script'
import { estimateSceneTimings } from '../script/scene-timing'
import { caseTruth, type RunData } from './verify-run'

/** Emily's run as the pipeline would write it today, built without Claude, the voice or Chrome. */
export const emilyRun = (): RunData => {
  const survey: Survey = { nickname: 'Em', explainLevel: 'simple', topOfMind: 'protection', decisionStyle: 'ask_trusted' }
  const { adult, brief, facts } = caseTruth('daniel-emily-johnson', 'emily', survey)
  const script = buildFallbackScript(brief, facts)
  const props: VideoProps = { brief, script, facts, scenes: estimateSceneTimings(script) }
  const runId = 'daniel-emily-johnson/emily/2026-11-18T10-00-00-000Z'
  const result = buildJobResult({
    runId,
    caseId: brief.caseId,
    member: adult.id,
    partner: adult.partner,
    brief,
    facts,
    script,
    timings: props.scenes,
    videoUrl: `/runs/${runId}/video.mp4`,
  })
  return { result, props, survey, sceneSources: null, log: '2026-11-18T10:01:00.000Z [render] video.mp4 written with the standard scenes\n' }
}

const created: string[] = []

/** A new empty folder under the system's temp folder, removed by `removeTempDirs`. */
export const tempDir = (prefix: string): string => {
  const dir = mkdtempSync(join(tmpdir(), `sherpas-${prefix}-`))
  created.push(dir)
  return dir
}

/** Removes every folder `tempDir` made in this test file (call it in `afterAll`). */
export const removeTempDirs = (): void => {
  created.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }))
}

const writeJson = (path: string, value: unknown): void => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)

/** Writes a run folder with the files `demo:add` reads; the "video" is a few bytes. */
export const writeRunFolder = (dir: string, data: RunData): string => {
  mkdirSync(dir, { recursive: true })
  writeJson(join(dir, 'result.json'), data.result)
  writeJson(join(dir, 'video-props.json'), data.props)
  writeJson(join(dir, 'survey.json'), data.survey)
  writeFileSync(join(dir, 'video.mp4'), 'not really a video')
  if (data.log !== null) writeFileSync(join(dir, 'log.txt'), data.log)
  data.sceneSources?.forEach((source, key) => {
    const path = join(dir, 'video-template', key)
    mkdirSync(join(path, '..'), { recursive: true })
    writeFileSync(path, source)
  })
  return dir
}
