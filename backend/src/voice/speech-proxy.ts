/// <reference types="node" />
import { z } from 'zod'
import type { TimedWord } from './captions'

/**
 * Narration through the team's LLM proxy (LiteLLM, OpenAI-compatible), which fronts ElevenLabs (SPEC §5.3):
 *   1. `POST /v1/audio/speech` turns the text into an MP3 with the brand voice;
 *   2. `POST /v1/audio/transcriptions` (Scribe) gives back when each word of that MP3 is said.
 */

/** ElevenLabs Multilingual v2: high fidelity, reads figures such as "$1.4M" well. */
export const TTS_MODEL = 'eleven-multilingual-v2'
/** ElevenLabs Scribe, for word timestamps of the generated audio. */
export const TRANSCRIPTION_MODEL = 'scribe-v2'
const SPEECH_PATH = '/v1/audio/speech'
const TRANSCRIPTION_PATH = '/v1/audio/transcriptions'
const AUDIO_TYPE = 'audio/mpeg'
const REQUEST_TIMEOUT_MS = 90_000
const MAX_ERROR_DETAIL_CHARS = 300
const UNAUTHORIZED = 401
const TOO_MANY_REQUESTS = 429

/** Everything that decides the audio: two equal requests give the same voice, so they share a cache entry. */
export interface SpeechRequest {
  readonly text: string
  readonly voiceId: string
  readonly model: string
  /** Host of the proxy: another proxy may serve another voice under the same id. */
  readonly proxyHost: string
}

export interface Speech {
  readonly audio: Uint8Array
  /** The words Scribe heard, timed in seconds from the start of the audio. */
  readonly words: readonly TimedWord[]
}

/** Turns text into timed speech. Swappable so the narration can be tested without the network. */
export type Synthesize = (request: SpeechRequest) => Promise<Speech>

export type Env = Readonly<Record<string, string | undefined>>

export interface ProxyConfig {
  readonly baseUrl: string
  readonly apiKey: string
}

const requiredEnv = (env: Env, name: string, what: string): string => {
  const value = env[name]?.trim()
  if (!value) throw new Error(`${name} is not set: add ${what} to .env at the repository root`)
  return value
}

const parseBaseUrl = (value: string): string => {
  try {
    return new URL(value).origin
  } catch {
    throw new Error(`LLM_PROXY_URL is not a valid URL: "${value}"`)
  }
}

export const readProxyConfig = (env: Env): ProxyConfig => ({
  baseUrl: parseBaseUrl(requiredEnv(env, 'LLM_PROXY_URL', 'the URL of the team LLM proxy')),
  apiKey: requiredEnv(env, 'LLM_PROXY_KEY', 'your key for the team LLM proxy'),
})

export const readVoiceId = (env: Env): string =>
  requiredEnv(env, 'ELEVENLABS_VOICE_ID', 'the ElevenLabs id of the brand voice')

export const speechRequest = (text: string, voiceId: string, config: ProxyConfig): SpeechRequest => ({
  text,
  voiceId,
  model: TTS_MODEL,
  proxyHost: new URL(config.baseUrl).host,
})

const parseJsonOrUndefined = (body: string): unknown => {
  try {
    return JSON.parse(body)
  } catch {
    return undefined
  }
}

/** The readable part of an error body: LiteLLM's `{ error: { message } }`, `{ detail }` or plain text. */
export const errorDetail = (body: string): string => {
  const parsed = parseJsonOrUndefined(body) as { error?: { message?: unknown } | string; detail?: unknown } | undefined
  const error = parsed?.error
  const message =
    typeof error === 'string'
      ? error
      : typeof error?.message === 'string'
        ? error.message
        : typeof parsed?.detail === 'string'
          ? parsed.detail
          : body
  return message.trim().slice(0, MAX_ERROR_DETAIL_CHARS) || 'no details'
}

const failure = (what: string, status: number, body: string): Error => {
  const detail = errorDetail(body)
  if (status === UNAUTHORIZED) return new Error(`The LLM proxy rejected LLM_PROXY_KEY (${status}): ${detail}`)
  if (status === TOO_MANY_REQUESTS) {
    return new Error(`The LLM proxy refused the ${what}: rate limit or budget reached (${status}): ${detail}`)
  }
  return new Error(`The LLM proxy answered ${status} for the ${what}: ${detail}`)
}

/** "fetch failed (ECONNRESET)": undici hides the network error code in `cause`. */
const reason = (error: unknown): string => {
  if (!(error instanceof Error)) return String(error)
  const cause = error.cause as { code?: unknown; message?: unknown } | undefined
  const detail = cause?.code ?? cause?.message
  return typeof detail === 'string' ? `${error.message} (${detail})` : error.message
}

/** A dropped connection or a 5xx from the proxy is retried; anything else fails at once. */
export const MAX_RETRIES = 2
export const RETRY_DELAY_MS = 1_000
const FIRST_SERVER_ERROR = 500

const isRetryable = (outcome: Response | Error): boolean =>
  outcome instanceof Error || outcome.status >= FIRST_SERVER_ERROR

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/** POSTs to the proxy with the key in the header only: the key is never logged or thrown. */
const post = async (
  config: ProxyConfig,
  path: string,
  what: string,
  init: { readonly headers?: Record<string, string>; readonly body: BodyInit },
  fetchFn: typeof fetch,
  retriesLeft = MAX_RETRIES,
): Promise<Response> => {
  const outcome = await fetchFn(`${config.baseUrl}${path}`, {
    method: 'POST',
    headers: { ...init.headers, authorization: `Bearer ${config.apiKey}` },
    body: init.body,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  }).catch((error: unknown) => new Error(`Could not reach the LLM proxy for the ${what}: ${reason(error)}`, { cause: error }))

  if (!(outcome instanceof Error) && outcome.ok) return outcome
  if (retriesLeft > 0 && isRetryable(outcome)) {
    await wait(RETRY_DELAY_MS * (MAX_RETRIES - retriesLeft + 1))
    return post(config, path, what, init, fetchFn, retriesLeft - 1)
  }
  if (outcome instanceof Error) throw outcome
  throw failure(what, outcome.status, await outcome.text())
}

const TranscriptionSchema = z.object({
  words: z.array(z.object({ word: z.string(), start: z.number(), end: z.number() })),
})

const speechAudio = async (request: SpeechRequest, config: ProxyConfig, fetchFn: typeof fetch): Promise<Uint8Array> => {
  const body = JSON.stringify({ model: request.model, voice: request.voiceId, input: request.text })
  const headers = { 'content-type': 'application/json', accept: AUDIO_TYPE }
  const response = await post(config, SPEECH_PATH, 'speech', { headers, body }, fetchFn)
  const audio = new Uint8Array(await response.arrayBuffer())
  if (audio.length === 0) throw new Error('The LLM proxy answered the speech request without audio')
  return audio
}

const wordTimes = async (audio: Uint8Array, config: ProxyConfig, fetchFn: typeof fetch): Promise<TimedWord[]> => {
  const form = new FormData()
  form.append('model', TRANSCRIPTION_MODEL)
  form.append('file', new Blob([new Uint8Array(audio)], { type: AUDIO_TYPE }), 'narration.mp3')
  form.append('response_format', 'verbose_json')
  form.append('timestamp_granularities[]', 'word')
  const response = await post(config, TRANSCRIPTION_PATH, 'transcription', { body: form }, fetchFn)
  const parsed = TranscriptionSchema.safeParse(await response.json())
  if (!parsed.success) throw new Error('The LLM proxy answered the transcription without word timestamps')
  return parsed.data.words
    .map(({ word, start, end }) => ({ text: word.trim(), startSec: start, endSec: Math.max(start, end) }))
    .filter((word) => word.text.length > 0)
}

/** Speech and then its word timestamps, through the proxy at `config`. */
export const createProxySynthesizer =
  (config: ProxyConfig, fetchFn: typeof fetch = fetch): Synthesize =>
  async (request) => {
    const audio = await speechAudio(request, config, fetchFn)
    return { audio, words: await wordTimes(audio, config, fetchFn) }
  }
