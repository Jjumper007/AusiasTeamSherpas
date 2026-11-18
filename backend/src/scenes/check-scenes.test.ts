import { videoPropsFixture, type Facts } from '@sherpas/shared'
import { describe, expect, it } from 'vitest'
import { SCENES_START_SEC, videoDurationSec } from '../pipeline/video-timeline'
import { checkFrames, durationProblems, numberGuardProblems, tscProblems } from './check-scenes'

const facts: Facts = { RETIREMENT_GAP: { value: 1427455.89, unit: 'usd', label: 'Retirement gap' } }

describe('checkFrames', () => {
  it('picks one frame 60% into each scene, after the logo opening', () => {
    const timings = [{ durationSec: 10 }, { durationSec: 20 }, { durationSec: 10 }, { durationSec: 10 }, { durationSec: 10 }] as const
    const opening = SCENES_START_SEC * 30
    expect(checkFrames([...timings] as never, 30)).toEqual([180, 660, 1080, 1380, 1680].map((frame) => frame + opening))
  })

  it('stays inside the fixture video', () => {
    const frames = checkFrames(videoPropsFixture.scenes)
    expect(frames).toHaveLength(5)
    expect(Math.max(...frames)).toBeLessThan(videoDurationSec(videoPropsFixture.scenes) * 30)
  })
})

describe('durationProblems', () => {
  it('accepts 60 to 120 seconds and explains anything else', () => {
    expect(durationProblems(60)).toEqual([])
    expect(durationProblems(120)).toEqual([])
    expect(durationProblems(59.9)).toEqual(['The video lasts 59.9 s; it must last between 60 and 120 s.'])
    expect(durationProblems(121)).toHaveLength(1)
  })
})

describe('numberGuardProblems', () => {
  it('passes figures read from facts through fmt, and rejects typed ones with the file name', () => {
    const good = 'export const A = () => <div>{fmt.round(facts.RETIREMENT_GAP)}</div>'
    const bad = 'export const B = () => <div>$1.5M short</div>'
    const problems = numberGuardProblems(new Map([['src/scenes/A.tsx', good], ['src/scenes/B.tsx', bad]]), facts)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatch(/^src\/scenes\/B\.tsx: Number "\$1\.5M"/)
  })
})

describe('tscProblems', () => {
  it('keeps the error lines and caps them', () => {
    const lines = Array.from({ length: 25 }, (_, index) => `src/scenes/A.tsx(${index + 1},1): error TS2304: Cannot find name 'x'.`)
    const problems = tscProblems(['noise', ...lines].join('\n'))
    expect(problems).toHaveLength(21)
    expect(problems[0]).toBe("TypeScript: src/scenes/A.tsx(1,1): error TS2304: Cannot find name 'x'.")
    expect(problems.at(-1)).toBe('TypeScript: … and 5 more errors.')
  })
})
