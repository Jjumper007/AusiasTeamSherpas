import { describe, expect, it } from 'vitest'
import { replaySteps } from './run-replay'

/** Daniel's demo run, as log.txt wrote it (voice lines trimmed). */
const DANIEL_LOG = [
  '2026-11-18T21:21:12.659Z [brief] daniel-emily-johnson/daniel: 86 facts',
  '2026-11-18T21:21:40.870Z [script] written by Claude (prompt v2, attempt 1/3)',
  '2026-11-18T21:21:42.838Z [voice] audio/scene-1.mp3: 4.55 s, from the proxy',
  '2026-11-18T21:21:53.863Z [voice] 5 scenes: 0 from cache, 5 from the proxy (voice cjVigY5qzO86Huf0OWal)',
  '2026-11-18T21:24:03.595Z [scenes] what_matters, what_changes written by Claude (prompt v2, attempt 1/3)',
  "2026-11-18T21:26:21.527Z [review] kept Claude's visual fixes to src/scenes/WhatChangesScene.tsx (prompt v1): I fixed it",
  "2026-11-18T21:28:47.730Z [render] video.mp4 written with Claude's scenes",
  '',
].join('\n')

describe('replaySteps', () => {
  it('gives each step of the run with how long it really took, in order', () => {
    expect(replaySteps(DANIEL_LOG)).toEqual([
      { step: 'brief', label: 'Reading your plan', seconds: 0 },
      { step: 'script', label: 'Writing your script', seconds: 28 },
      { step: 'voice', label: 'Recording the narration', seconds: 13 },
      { step: 'scenes', label: 'Designing your scenes', seconds: 130 },
      { step: 'review', label: 'Checking how your scenes look', seconds: 138 },
      { step: 'render', label: 'Rendering your video', seconds: 146 },
    ])
  })

  it('leaves out a step the run never logged, such as the visual review when it is off', () => {
    const log = DANIEL_LOG.split('\n').filter((line) => !line.includes('[review]')).join('\n')

    expect(replaySteps(log)?.map(({ step, seconds }) => [step, seconds])).toEqual([
      ['brief', 0],
      ['script', 28],
      ['voice', 13],
      ['scenes', 130],
      ['render', 284],
    ])
  })

  it('ignores lines that are not log entries, like the lines of a stack trace', () => {
    const log = DANIEL_LOG.replace('[script]', '[script]\n    at writeScript (write-script.ts:10:3)')

    expect(replaySteps(log)).toHaveLength(6)
  })

  it('gives null when the log does not show the video being written', () => {
    const unfinished = DANIEL_LOG.split('\n').filter((line) => !line.includes('[render]')).join('\n')

    expect(replaySteps(unfinished)).toBeNull()
    expect(replaySteps('')).toBeNull()
  })
})
