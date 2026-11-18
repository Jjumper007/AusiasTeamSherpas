import { describe, expect, test } from 'vitest'
import type { Facts } from '../facts'
import { factsFixture } from '../fixtures/facts.daniel'
import { validateTsx } from './validate'

const facts: Facts = factsFixture

const numbersRejected = (source: string): readonly string[] =>
  validateTsx(source, facts).errors.map((error) => error.number)

const REALISTIC_SCENE = `
import React from 'react'
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { fmt } from '@sherpas/shared'
import { RETIREMENT_GAP, RETIREMENT_YEAR, SCORE_NOW } from './facts'
import { tokens } from './tokens-v1024'

const SUMMIT_HEIGHT = 1080
const RIDGE_PATH = 'M 0 900 L 480 420 L 960 640 L 1440 300 L 1920 760 Z'

// Fades in over 120 frames, 1500 ms in total.
export const WhatMatters: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const opacity = interpolate(frame, [0, 120], [0, 1], { extrapolateRight: 'clamp' })
  const lift = spring({ frame, fps, config: { damping: 200, stiffness: 120 } })
  const visible = frame < 240 && durationInFrames > 300

  return (
    <AbsoluteFill style={{ backgroundColor: '#1a2b3c', fontWeight: '700', padding: '120px 160px' }}>
      <svg viewBox="0 0 1920 1080" width={1920} height={SUMMIT_HEIGHT}>
        <path d={RIDGE_PATH} fill="rgba(255, 255, 255, 0.85)" strokeWidth="12" />
        <polyline points="0,900 480,420 960,640" stroke="#ffffff" />
        <circle cx="1440" cy="300" r="24" transform={\`translate(\${lift * 400}, 120)\`} />
      </svg>
      <Sequence from={150} durationInFrames={450}>
        <h1 style={{ opacity, fontSize: 144, transform: \`translateY(\${(1 - lift) * 200}px)\` }}>
          Your retirement gap is {fmt.round(RETIREMENT_GAP)}
        </h1>
        <p className="mt-128 text-zinc-500">
          Altitude {SCORE_NOW} of 100. Summit in {RETIREMENT_YEAR}, {visible ? 'steep' : 'gentle'} climb.
        </p>
        <Stat label="Gap" value={fmt.currency(RETIREMENT_GAP)} caption="in today's dollars, by 2044" />
      </Sequence>
    </AbsoluteFill>
  )
}
`

describe('validateTsx: accepted source', () => {
  test('accepts a realistic scene that only shows facts through fmt', () => {
    expect(validateTsx(REALISTIC_SCENE, facts)).toEqual({ ok: true, errors: [] })
  })

  test('accepts fact figures written in JSX text and string props', () => {
    const source = `
      export const A = () => (
        <div>
          <span>$1.4M short, $34K a year</span>
          <Stat value="$1,427,456" unit={'49%'} />
          <span>{\`Retire in 2044 with \${fmt.round(GAP)} to close\`}</span>
        </div>
      )`
    expect(numbersRejected(source)).toEqual([])
  })

  test('treats numeric literals in props, style and arithmetic as structural', () => {
    const source = `
      const WIDTH = 1920
      const total = frame * 1000 + 250
      export const A = () => <Sequence from={300} durationInFrames={WIDTH / 128}><Img width={1280} /></Sequence>`
    expect(numbersRejected(source)).toEqual([])
  })

  test('ignores comments, imports and asset paths', () => {
    const source = `
      import a from './scene-1500'
      /* 1500000 dollars */
      // $1.5M
      const audio = staticFile('audio/scene-001.mp3')
      export const A = () => <div>{/* 123456 */}ok</div>`
    expect(numbersRejected(source)).toEqual([])
  })

  test('ignores CSS values inside strings', () => {
    const source = `
      const shadow = '0 12px 480px rgba(0, 0, 0, 0.25)'
      const size = '1920x1080'
      const titleStyle = { letterSpacing: '0.125em', flex: '1 1 320' }
      export const A = () => <div className="w-1280" style={{ width: '1200px', zIndex: '999' }} />`
    expect(numbersRejected(source)).toEqual([])
  })

  test('does not confuse comparisons and generics with JSX', () => {
    const source = `
      const ref = useRef<HTMLDivElement>(null)
      const early = frame < limit && limit > 1500
      const label: Record<string, number> = { a: 1500 }
      export const A = () => <div>{early ? <b>{SCORE_NOW}</b> : null}</div>`
    expect(numbersRejected(source)).toEqual([])
  })
})

describe('validateTsx: rejected source', () => {
  test('rejects an invented figure in JSX text', () => {
    expect(numbersRejected('const A = () => <h1>Your gap is $1.5M</h1>')).toEqual(['$1.5M'])
    expect(numbersRejected('const A = () => <h1>\n  Save 12,500 a year\n</h1>')).toEqual(['12,500'])
  })

  test('rejects an invented figure in a string literal or template literal', () => {
    expect(numbersRejected(`const label = 'Gap: $1,500,000'`)).toEqual(['$1,500,000'])
    expect(numbersRejected('const label = `Retire in 2045 with ${x}`')).toEqual(['2045'])
    expect(numbersRejected('const A = () => <Stat value="$1.5M" />')).toEqual(['$1.5M'])
    expect(numbersRejected(`const A = () => <Stat value={'$35K'} />`)).toEqual(['$35K'])
  })

  test('rejects a numeric literal passed to fmt', () => {
    expect(numbersRejected('const A = () => <h1>{fmt.round(1500000)}</h1>')).toEqual(['1500000'])
    expect(numbersRejected('const text = fmt.currency(Math.max(GAP, 35000))')).toEqual(['35000'])
  })

  test('accepts an exact fact value passed to fmt', () => {
    expect(numbersRejected('const A = () => <h1>{fmt.round(1427455.89)}</h1>')).toEqual([])
  })

  test('rejects a bare numeric literal rendered as a JSX child', () => {
    expect(numbersRejected('const A = () => <h1>{1500000}</h1>')).toEqual(['1500000'])
    expect(numbersRejected('const A = () => <h1>{ 1166000 }</h1>')).toEqual([])
  })

  test('still checks JSX nested inside a structural prop', () => {
    const source = 'const A = () => <Box style={{ width: 1200 }} icon={<b>$1.5M</b>} />'
    expect(numbersRejected(source)).toEqual(['$1.5M'])
  })

  test('reports line, column and nearest fact for source code', () => {
    const source = 'export const A = () => (\n  <h1>Gap of $1.5M</h1>\n)\n'
    const [error] = validateTsx(source, facts).errors

    expect(error).toMatchObject({
      number: '$1.5M',
      line: 2,
      column: 14,
      nearestFact: { name: 'RETIREMENT_GAP' },
    })
    expect(error?.message).toContain('line 2, column 14')
    expect(error?.message).toContain('Write it as "$1.4M" or "$1,427,456"')
  })

  test('checks strings again after a structural value ends', () => {
    const source = "const width = '1200'\nconst label = '$1.5M'\nconst box = { height: '900', caption: '$35K' }"
    expect(numbersRejected(source)).toEqual(['$1.5M', '$35K'])
  })

  test('never throws on malformed source', () => {
    expect(() => validateTsx('const A = () => <div>{`unclosed ${ <b>1500', facts)).not.toThrow()
    expect(() => validateTsx("const s = 'unterminated 1500", facts)).not.toThrow()
    expect(validateTsx('', facts)).toEqual({ ok: true, errors: [] })
  })
})
