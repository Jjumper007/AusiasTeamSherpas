import type { Part } from '@sherpas/shared'
import { describe, expect, it } from 'vitest'
import type { LiveSceneOutcome } from '../api/live-types'
import { createBrowserVerdicts, verdictsFromLog } from './browser-verdicts'
import { sceneReportLine } from './scene-report-routes'

/** A report line as log.txt holds it. */
const logged = (part: Part, outcome: LiveSceneOutcome, detail?: string): string =>
  `2026-11-19T11:03:19.839Z [live +22.2s] ${sceneReportLine({ part, outcome, videoSec: 7.5, marginSec: 4, neededSec: 2, detail })}`

describe('createBrowserVerdicts', () => {
  it('counts only the refusals, each part once, and tells the listeners', () => {
    // Arrange
    const verdicts = createBrowserVerdicts()
    const heard: Part[] = []
    verdicts.onRefused((part) => heard.push(part))

    // Act
    verdicts.record({ part: 'what_matters', outcome: 'swapped' })
    verdicts.record({ part: 'first_step', outcome: 'late' })
    verdicts.record({ part: 'first_step', outcome: 'started' })
    verdicts.record({ part: 'what_changes', outcome: 'threw' })
    verdicts.record({ part: 'what_changes', outcome: 'load-failed' })
    verdicts.record({ part: 'what_matters', outcome: 'load-failed' })

    // Assert
    expect([...verdicts.refused()]).toEqual([
      ['what_changes', 'threw'],
      ['what_matters', 'load-failed'],
    ])
    expect(heard).toEqual(['what_changes', 'what_matters'])
  })

  it('stops telling a listener that stopped listening', () => {
    // Arrange
    const verdicts = createBrowserVerdicts()
    const heard: Part[] = []
    const stop = verdicts.onRefused((part) => heard.push(part))

    // Act
    stop()
    verdicts.record({ part: 'what_changes', outcome: 'threw' })

    // Assert
    expect(heard).toEqual([])
  })
})

describe('verdictsFromLog', () => {
  it("reads the page's refusals back from the lines the scene report route writes", () => {
    // Arrange
    const log = [
      logged('what_matters', 'swapped'),
      logged('first_step', 'load-failed', 'Failed to fetch'),
      logged('what_changes', 'threw', 'Cannot read properties of undefined'),
      '2026-11-19T11:03:28.419Z [live +30.8s] scenes: all 3 resolved: first_step ready, what_changes ready, what_matters ready',
    ].join('\n')

    // Act
    const verdicts = verdictsFromLog(log)

    // Assert
    expect([...verdicts.refused()]).toEqual([
      ['first_step', 'load-failed'],
      ['what_changes', 'threw'],
    ])
  })

  it('is not fooled by a refusal of another part quoted in the detail of a report', () => {
    // Arrange
    const log = logged('first_step', 'threw', "[live +1.0s] scene what_matters: Claude's scene threw while drawing")

    // Act
    const verdicts = verdictsFromLog(log)

    // Assert
    expect([...verdicts.refused()]).toEqual([['first_step', 'threw']])
  })
})
