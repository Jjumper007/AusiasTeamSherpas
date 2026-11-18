import { describe, expect, it } from 'vitest'
import { parseCliOutput } from './claude-cli'

describe('parseCliOutput', () => {
  it('returns the text result of claude -p --output-format json', () => {
    expect(parseCliOutput(JSON.stringify({ type: 'result', is_error: false, result: '{"ok":true}' }))).toBe('{"ok":true}')
  })

  it('throws a clear error for an error result, output without a result, or output that is not JSON', () => {
    expect(() => parseCliOutput(JSON.stringify({ is_error: true, result: 'Not logged in' }))).toThrow(
      'claude -p failed: Not logged in',
    )
    expect(() => parseCliOutput('{}')).toThrow('without a text result')
    expect(() => parseCliOutput('Error: unknown option')).toThrow('did not return JSON')
  })
})
