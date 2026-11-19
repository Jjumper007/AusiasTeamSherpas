import { z } from 'zod'

/**
 * Reads `claude -p --output-format stream-json --include-partial-messages` as it arrives: one JSON
 * object per line, with stdout chunks that may cut a line anywhere. The Live run hands each piece of
 * text over at once (docs/specs/live-run.md, "Script by streaming"). Pure, so tests feed it chunks.
 */

/** What the stream has said so far. */
export interface StreamRead {
  /** Every text delta, joined: the answer so far if the process stops before its result line. */
  readonly streamed: string
  /** The final `result` line, once it has arrived. */
  readonly result?: { readonly isError: boolean; readonly text: string }
}

export interface StreamReader {
  /** Reads one chunk of stdout, calling `onText` for each text delta in the lines it completes. */
  readonly push: (chunk: string) => void
  /** Reads a last line left without its newline, and returns what the stream said. */
  readonly end: () => StreamRead
}

const LINE_BREAK = '\n'

/** A piece of the answer: `{"type":"stream_event","event":{"type":"content_block_delta","delta":{"type":"text_delta",…}}}`. */
const TextDeltaLineSchema = z.object({
  type: z.literal('stream_event'),
  event: z.object({
    type: z.literal('content_block_delta'),
    delta: z.object({ type: z.literal('text_delta'), text: z.string() }),
  }),
})

/**
 * The last line, with the whole answer, as `--output-format json` gives it. An error result may come
 * without `result`; its `subtype` (e.g. `error_during_execution`) then says what went wrong.
 */
const ResultLineSchema = z.object({
  type: z.literal('result'),
  is_error: z.boolean(),
  result: z.string().optional(),
  subtype: z.string().optional(),
})

/**
 * The parsed line, or undefined when it is not JSON. The CLI writes whole JSON lines, so a broken one
 * is noise to skip: the answer still comes from the result line, or from the deltas around it.
 */
const parseLine = (line: string): unknown => {
  try {
    return JSON.parse(line)
  } catch {
    return undefined
  }
}

export const createStreamReader = (onText: (text: string) => void): StreamReader => {
  let pending = ''
  let streamed = ''
  let result: StreamRead['result']

  /** Text deltas and the result line count; any other line (system, assistant, thinking, rate limit) is skipped. */
  const readLine = (line: string): void => {
    if (line.trim() === '') return
    const json = parseLine(line)
    const delta = TextDeltaLineSchema.safeParse(json)
    if (delta.success) {
      streamed += delta.data.event.delta.text
      onText(delta.data.event.delta.text)
      return
    }
    const last = ResultLineSchema.safeParse(json)
    if (!last.success) return
    const { is_error: isError, result: text, subtype } = last.data
    // A success without text is no answer: the streamed text stays the fallback.
    if (text !== undefined) result = { isError, text }
    else if (isError) result = { isError, text: subtype ?? 'error result without details' }
  }

  return {
    push: (chunk) => {
      const lines = `${pending}${chunk}`.split(LINE_BREAK)
      pending = lines.pop() ?? ''
      lines.forEach(readLine)
    },
    end: () => {
      readLine(pending)
      pending = ''
      return result ? { streamed, result } : { streamed }
    },
  }
}
