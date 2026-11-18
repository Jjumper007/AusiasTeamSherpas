import { describe, expect, it } from 'vitest'
import { cliArgs, parseCliOutput } from './claude-cli'

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

describe('cliArgs', () => {
  it('gives the script call no tools, settings or MCP servers', () => {
    const args = cliArgs('system')
    expect(args).toEqual(expect.arrayContaining(['-p', '--strict-mcp-config', '--no-session-persistence']))
    expect(args[args.indexOf('--tools') + 1]).toBe('')
    expect(args[args.indexOf('--setting-sources') + 1]).toBe('')
    expect(args).not.toContain('--allowedTools')
    expect(args.slice(-2)).toEqual(['--system-prompt', 'system'])
  })

  it('lets the scenes call read, write and type-check, and nothing else without asking', () => {
    const args = cliArgs('system', { tools: ['Read', 'Edit', 'Bash'], allowedTools: ['Read', 'Edit', 'Bash(npx tsc:*)'] })
    expect(args[args.indexOf('--tools') + 1]).toBe('Read,Edit,Bash')
    expect(args[args.indexOf('--allowedTools') + 1]).toBe('Read,Edit,Bash(npx tsc:*)')
  })
})
