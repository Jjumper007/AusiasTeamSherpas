import { describe, expect, it } from 'vitest'
import { cliArgs } from './claude-cli'

const TODAY_ARGS = ['-p', '--output-format', 'json', '--setting-sources', '', '--strict-mcp-config', '--no-session-persistence']

describe('cliArgs with an effort', () => {
  it('adds --effort right after --model, and changes nothing else', () => {
    // Act
    const args = cliArgs('system', { model: 'sonnet', effort: 'low' })

    // Assert
    expect(args).toEqual([...TODAY_ARGS, '--model', 'sonnet', '--effort', 'low', '--tools', '', '--system-prompt', 'system'])
  })

  it('adds --effort alone when no model is asked for', () => {
    // Act
    const args = cliArgs('system', { effort: 'low' })

    // Assert
    expect(args).toEqual([...TODAY_ARGS, '--effort', 'low', '--tools', '', '--system-prompt', 'system'])
  })
})
