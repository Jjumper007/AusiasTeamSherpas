import { describe, expect, it } from 'vitest'
import type { ReplayStep } from '../types'
import { DEMO_NOTE, formatDuration, replayTicks } from './replay'

const steps: ReplayStep[] = [
  { step: 'brief', label: 'Reading your plan', seconds: 0 },
  { step: 'script', label: 'Writing your script', seconds: 28 },
  { step: 'scenes', label: 'Designing your scenes', seconds: 130 },
  { step: 'render', label: 'Rendering your video', seconds: 146 },
]

describe('formatDuration', () => {
  it.each([
    [0, 'under 1 s'],
    [28, '28 s'],
    [60, '1 min'],
    [130, '2 min 10 s'],
  ])('shows %i seconds as %s', (seconds, shown) => {
    expect(formatDuration(seconds)).toBe(shown)
  })
})

describe('replayTicks', () => {
  const ticks = replayTicks(steps, 8000)

  it('shows each step in order with how long it really took, then says it is a demo', () => {
    expect(ticks.map((tick) => tick.label)).toEqual([
      'Reading your plan · under 1 s',
      'Writing your script · 28 s',
      'Designing your scenes · 2 min 10 s',
      'Rendering your video · 2 min 26 s',
      DEMO_NOTE,
    ])
  })

  it('spreads the steps evenly over the replay, starting at once', () => {
    expect(ticks.map((tick) => tick.atMs)).toEqual([0, 1600, 3200, 4800, 6400])
  })

  it('fills the bar by the share of the real run the steps before each one took', () => {
    expect(ticks.map((tick) => tick.progress)).toEqual([0, 0, 28 / 304, 158 / 304, 1])
  })

  it('never shows the run as a whole, only its steps', () => {
    expect(ticks.map((tick) => tick.label).join(' ')).not.toMatch(/total|5 min 4 s/)
  })
})
