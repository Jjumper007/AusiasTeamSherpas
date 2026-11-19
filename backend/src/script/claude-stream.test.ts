/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { cliArgs, streamAnswer } from './claude-cli'
import { createStreamReader, type StreamRead } from './claude-stream'

/** A real `claude -p --output-format stream-json --include-partial-messages --verbose` answer, ids and usage removed. */
const SAMPLE = readFileSync(fileURLToPath(new URL('./fixtures/claude-stream-json.jsonl', import.meta.url)), 'utf8')
const SAMPLE_RESULT = (JSON.parse(SAMPLE.trim().split('\n').at(-1) ?? '') as { result: string }).result
const TODAY_ARGS = ['-p', '--output-format', 'json', '--setting-sources', '', '--strict-mcp-config', '--no-session-persistence']
const TIMEOUT_MS = 25_000

/** Feeds `text` to a new reader in pieces of `size` characters and collects what it hands over. */
const readInPieces = (text: string, size: number): { deltas: string[]; read: StreamRead } => {
  const deltas: string[] = []
  const reader = createStreamReader((delta) => deltas.push(delta))
  for (let at = 0; at < text.length; at += size) reader.push(text.slice(at, at + size))
  return { deltas, read: reader.end() }
}

const line = (value: unknown): string => `${JSON.stringify(value)}\n`
const textDelta = (text: string): string =>
  line({ type: 'stream_event', event: { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } } })

describe('cliArgs with a model and streaming', () => {
  it('keeps the arguments of today when neither is asked for', () => {
    // Act
    const script = cliArgs('system')
    const scenes = cliArgs('system', { tools: ['Read'], allowedTools: ['Read'], addDirs: ['/frames'], cwd: '/sandbox', timeoutMs: 1 })

    // Assert
    expect(script).toEqual([...TODAY_ARGS, '--tools', '', '--system-prompt', 'system'])
    expect(scenes).toEqual([...TODAY_ARGS, '--tools', 'Read', '--allowedTools', 'Read', '--add-dir', '/frames', '--system-prompt', 'system'])
  })

  it('adds --model with the model name, and changes nothing else', () => {
    // Act
    const args = cliArgs('system', { model: 'sonnet' })

    // Assert
    expect(args).toEqual([...TODAY_ARGS, '--model', 'sonnet', '--tools', '', '--system-prompt', 'system'])
  })

  it('asks for stream-json with partial messages, and --verbose that -p needs for it, when text is streamed', () => {
    // Act
    const args = cliArgs('system', { model: 'sonnet', onText: () => undefined })

    // Assert
    expect(args).toEqual([
      '-p',
      '--output-format',
      'stream-json',
      '--include-partial-messages',
      '--verbose',
      ...TODAY_ARGS.slice(3),
      '--model',
      'sonnet',
      '--tools',
      '',
      '--system-prompt',
      'system',
    ])
  })
})

describe('createStreamReader', () => {
  it('hands over the text deltas of a real answer in order, and keeps its result line', () => {
    // Act
    const { deltas, read } = readInPieces(SAMPLE, SAMPLE.length)

    // Assert
    expect(deltas.length).toBeGreaterThan(30)
    expect(deltas.join('')).toBe(SAMPLE_RESULT)
    expect(read).toEqual({ streamed: SAMPLE_RESULT, result: { isError: false, text: SAMPLE_RESULT } })
  })

  it('reads the same whatever the size of the chunks, even one character at a time', () => {
    // Arrange
    const whole = readInPieces(SAMPLE, SAMPLE.length)

    // Act
    const pieces = [1, 7, 64, 333].map((size) => readInPieces(SAMPLE, size))

    // Assert
    pieces.forEach((piece) => expect(piece).toEqual(whole))
  })

  it('reads a last line that has no newline once the output ends', () => {
    // Arrange
    const reader = createStreamReader(() => undefined)
    reader.push(textDelta('{"a":1}'))
    reader.push(JSON.stringify({ type: 'result', is_error: false, result: '{"a":1}' }))

    // Act
    const read = reader.end()

    // Assert
    expect(read.result).toEqual({ isError: false, text: '{"a":1}' })
  })

  it('ignores other line types, thinking deltas, blank and broken lines', () => {
    // Arrange
    const noise = [
      line({ type: 'system', subtype: 'init', tools: [] }),
      line({ type: 'stream_event', event: { type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: 'hmm' } } }),
      line({ type: 'stream_event', event: { type: 'message_delta', delta: { stop_reason: 'end_turn' } } }),
      line({ type: 'assistant', message: { content: [{ type: 'text', text: 'whole' }] } }),
      line({ type: 'some_future_event' }),
      '\n',
      '{"type":"stream_event", broken\n',
    ].join('')

    // Act
    const { deltas, read } = readInPieces(`${noise}${textDelta('Hi')}${noise}${textDelta(' Dan')}`, 5)

    // Assert
    expect(deltas).toEqual(['Hi', ' Dan'])
    expect(read).toEqual({ streamed: 'Hi Dan' })
  })

  it('keeps an error result as an error', () => {
    // Act
    const { read } = readInPieces(line({ type: 'result', is_error: true, result: 'Not logged in' }), 10)

    // Assert
    expect(read.result).toEqual({ isError: true, text: 'Not logged in' })
  })

  it('keeps an error result without text as an error named by its subtype', () => {
    // Act
    const { read } = readInPieces(line({ type: 'result', subtype: 'error_during_execution', is_error: true }), 10)

    // Assert
    expect(read.result).toEqual({ isError: true, text: 'error_during_execution' })
  })
})

describe('streamAnswer', () => {
  const exited = { code: 0, signal: null, stderr: '', timeoutMs: TIMEOUT_MS }
  const killed = { code: null, signal: 'SIGKILL' as const, stderr: '', timeoutMs: TIMEOUT_MS }

  it('answers with the result line, also when the process was stopped after it', () => {
    // Arrange
    const read = { streamed: '{"a"', result: { isError: false, text: '{"a":1}' } }

    // Act
    const answers = [streamAnswer(read, exited), streamAnswer(read, killed)]

    // Assert
    expect(answers).toEqual(['{"a":1}', '{"a":1}'])
  })

  it('answers with the text streamed so far when the process stops before the result line', () => {
    // Act
    const answer = streamAnswer({ streamed: '{"scenes":[{"part"' }, killed)

    // Assert
    expect(answer).toBe('{"scenes":[{"part"')
  })

  it('fails with the CLI message for an error result, as the json mode does', () => {
    // Act
    const answer = () => streamAnswer({ streamed: '', result: { isError: true, text: 'Not logged in' } }, exited)

    // Assert
    expect(answer).toThrow('claude -p failed: Not logged in')
  })

  it('fails as the json mode does when the CLI exits with an error after streaming some text', () => {
    // Act
    const answer = () => streamAnswer({ streamed: '{"scenes":[' }, { ...exited, code: 1, stderr: 'boom' })

    // Assert
    expect(answer).toThrow('claude -p exited with code 1: boom')
  })

  it('fails clearly when there is no text at all: stopped, crashed or silent', () => {
    // Act
    const stopped = () => streamAnswer({ streamed: '' }, killed)
    const crashed = () => streamAnswer({ streamed: '' }, { ...exited, code: 1, stderr: ' Error: unknown option \n' })
    const silent = () => streamAnswer({ streamed: '' }, exited)

    // Assert
    expect(stopped).toThrow('claude -p stopped (SIGKILL) after at most 25 s')
    expect(crashed).toThrow('claude -p exited with code 1: Error: unknown option')
    expect(silent).toThrow('claude -p ended without a result')
  })
})
