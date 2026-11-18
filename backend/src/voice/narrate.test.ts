/// <reference types="node" />
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { videoPropsFixture } from '@sherpas/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRunFolder } from '../pipeline/run-folder'
import { createNarrator } from './narrate'
import { VOICE_PAUSE_SEC } from './scene-durations'
import { speechCacheKey } from './speech-cache'
import { errorDetail, MAX_RETRIES, speechRequest, TTS_MODEL } from './speech-proxy'
import { fakeMp3, fakeSpokenWords, FRAME_SEC } from './test-helpers'

const PROXY_URL = 'https://proxy.test'
const PROXY_KEY = 'sk-test-secret'
const VOICE_ID = 'voice-1'
const ENV = { LLM_PROXY_URL: PROXY_URL, LLM_PROXY_KEY: PROXY_KEY, ELEVENLABS_VOICE_ID: VOICE_ID }
const CONFIG = { baseUrl: PROXY_URL, apiKey: PROXY_KEY }
const RUNS_URL = 'http://localhost:3017/runs'
/** 300 frames ≈ 7.84 s of audio per scene. */
const FRAMES = 300
const script = videoPropsFixture.script

const dirs: string[] = []
const tempDir = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'sherpas-voice-'))
  dirs.push(dir)
  return dir
}
afterEach(() => dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })))

/** Answers like the proxy: an MP3 for /audio/speech, Scribe words of the last text for /audio/transcriptions. */
const fakeProxy = () => {
  let lastText = ''
  return vi.fn<typeof fetch>(async (url, init) => {
    if (String(url).endsWith('/v1/audio/speech')) {
      lastText = (JSON.parse(String(init?.body)) as { input: string }).input
      return new Response(fakeMp3(FRAMES), { headers: { 'content-type': 'audio/mpeg' } })
    }
    const words = fakeSpokenWords(lastText.toLowerCase(), 0.2).map((word) => ({
      word: word.text,
      start: word.startSec,
      end: word.endSec,
    }))
    return Response.json({ text: lastText, words })
  })
}

const failingProxy = (status: number, message: string) =>
  vi.fn<typeof fetch>(async () => Response.json({ error: { message, type: 'error', code: String(status) } }, { status }))

const setup = (env: Readonly<Record<string, string | undefined>> = ENV, fetchFn = fakeProxy()) => {
  const cacheDir = tempDir()
  const runsDir = tempDir()
  const narrate = createNarrator({ env, cacheDir, runsUrl: RUNS_URL, fetchFn })
  const folder = (second: number) =>
    createRunFolder(runsDir, 'case', 'member', new Date(Date.UTC(2026, 10, 18, 0, 0, second)))
  return { narrate, folder, fetchFn }
}

const SPEECH_AND_TRANSCRIPTION = 2

describe('createNarrator', () => {
  it('voices each scene into audio/scene-N.mp3 and times the scene and its captions from the audio', async () => {
    const { narrate, folder } = setup()
    const run = folder(0)
    const progress: number[] = []
    const scenes = await narrate(script, run, (fraction) => progress.push(fraction))

    expect([1, 2, 3, 4, 5].filter((n) => !existsSync(run.path(`audio/scene-${n}.mp3`)))).toEqual([])
    expect(scenes[1].audioFile).toBe(`${RUNS_URL}/${run.runId}/audio/scene-2.mp3`)
    expect(scenes[1].durationSec).toBeGreaterThanOrEqual(FRAMES * FRAME_SEC + VOICE_PAUSE_SEC)
    expect(scenes[1].captions?.map((cue) => cue.text).join(' ')).toBe(script.scenes[1].narration)
    expect(scenes[1].captions?.[0].startSec).toBeCloseTo(0.1)
    expect(progress.at(-1)).toBe(1)
  })

  it('serves repeated text from the cache without calling the proxy again', async () => {
    const { narrate, folder, fetchFn } = setup()
    const first = await narrate(script, folder(0), () => undefined)
    expect(fetchFn).toHaveBeenCalledTimes(script.scenes.length * SPEECH_AND_TRANSCRIPTION)

    const secondRun = folder(1)
    const second = await narrate(script, secondRun, () => undefined)
    expect(fetchFn).toHaveBeenCalledTimes(script.scenes.length * SPEECH_AND_TRANSCRIPTION)
    expect(second).toEqual(first.map((scene) => ({ ...scene, audioFile: scene.audioFile?.replace(/00-00-00/, '00-00-01') })))
    expect(readFileSync(secondRun.path('log.txt'), 'utf8')).toContain('5 from cache, 0 from the proxy')
  })

  it('sends the key only as a bearer header, and the model, voice and text as the speech request', async () => {
    const { narrate, folder, fetchFn } = setup()
    await narrate(script, folder(0), () => undefined)
    const [speechUrl, speechInit] = fetchFn.mock.calls[0]
    expect(String(speechUrl)).toBe(`${PROXY_URL}/v1/audio/speech`)
    expect(new Headers(speechInit?.headers).get('authorization')).toBe(`Bearer ${PROXY_KEY}`)
    expect(JSON.parse(String(speechInit?.body))).toEqual({ model: TTS_MODEL, voice: VOICE_ID, input: script.scenes[0].narration })
    const [transcriptionUrl, transcriptionInit] = fetchFn.mock.calls[1]
    expect(String(transcriptionUrl)).toBe(`${PROXY_URL}/v1/audio/transcriptions`)
    const form = transcriptionInit?.body as FormData
    expect(form.get('model')).toBe('scribe-v2')
    expect(form.getAll('timestamp_granularities[]')).toEqual(['word'])
  })

  it('fails clearly when the proxy URL, its key or the voice is missing, before calling anything', async () => {
    const cases = [
      [{ ...ENV, LLM_PROXY_URL: undefined }, /LLM_PROXY_URL is not set/],
      [{ ...ENV, LLM_PROXY_KEY: '' }, /LLM_PROXY_KEY is not set/],
      [{ ...ENV, ELEVENLABS_VOICE_ID: ' ' }, /ELEVENLABS_VOICE_ID is not set/],
      [{ ...ENV, LLM_PROXY_URL: 'not a url' }, /LLM_PROXY_URL is not a valid URL/],
    ] as const
    for (const [env, message] of cases) {
      const { narrate, folder, fetchFn } = setup(env)
      await expect(narrate(script, folder(0), () => undefined)).rejects.toThrow(message)
      expect(fetchFn).not.toHaveBeenCalled()
    }
  })

  it('reports a rejected key with the proxy message, never the key', async () => {
    const { narrate, folder } = setup(ENV, failingProxy(401, 'Authentication Error, Invalid proxy server token passed.'))
    const error = await narrate(script, folder(0), () => undefined).then(
      () => new Error('no error'),
      (caught: unknown) => caught as Error,
    )
    expect(error.message).toBe(
      'The LLM proxy rejected LLM_PROXY_KEY (401): Authentication Error, Invalid proxy server token passed.',
    )
    expect(error.message).not.toContain(PROXY_KEY)
  })

  it('reports a rate or budget limit, and any other proxy error with its message', async () => {
    const limited = setup(ENV, failingProxy(429, 'Budget has been exceeded!'))
    await expect(limited.narrate(script, limited.folder(0), () => undefined)).rejects.toThrow(
      'The LLM proxy refused the speech: rate limit or budget reached (429): Budget has been exceeded!',
    )
    expect(limited.fetchFn).toHaveBeenCalledTimes(1)
  })

  it(`retries a 5xx ${MAX_RETRIES} times, then reports it with the proxy message`, async () => {
    vi.useFakeTimers()
    try {
      const broken = setup(ENV, failingProxy(500, 'ElevenLabs is down'))
      const result = expect(broken.narrate(script, broken.folder(0), () => undefined)).rejects.toThrow(
        'The LLM proxy answered 500 for the speech: ElevenLabs is down',
      )
      await vi.runAllTimersAsync()
      await result
      expect(broken.fetchFn).toHaveBeenCalledTimes(1 + MAX_RETRIES)
    } finally {
      vi.useRealTimers()
    }
  })

  it('recovers from a dropped connection by retrying the same request', async () => {
    vi.useFakeTimers()
    try {
      const proxy = fakeProxy()
      let dropped = false
      const flaky = vi.fn<typeof fetch>(async (url, init) => {
        if (!dropped && String(url).endsWith('/v1/audio/transcriptions')) {
          dropped = true
          throw new TypeError('fetch failed', { cause: { code: 'ECONNRESET' } })
        }
        return proxy(url, init)
      })
      const { narrate, folder } = setup(ENV, flaky)
      const timings = narrate(script, folder(0), () => undefined)
      await vi.runAllTimersAsync()
      expect(await timings).toHaveLength(script.scenes.length)
      expect(flaky).toHaveBeenCalledTimes(script.scenes.length * SPEECH_AND_TRANSCRIPTION + 1)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('errorDetail', () => {
  it('reads LiteLLM errors, FastAPI details and plain text', () => {
    expect(errorDetail('{"error":{"message":"No budget"}}')).toBe('No budget')
    expect(errorDetail('{"detail":"Not found"}')).toBe('Not found')
    expect(errorDetail('Bad gateway')).toBe('Bad gateway')
    expect(errorDetail('')).toBe('no details')
  })
})

describe('speechCacheKey', () => {
  it('changes with the text, the voice, the model and the proxy', () => {
    const request = speechRequest('Hello Dan.', VOICE_ID, CONFIG)
    const key = speechCacheKey(request)
    expect(speechCacheKey(speechRequest('Hello Dan.', VOICE_ID, CONFIG))).toBe(key)
    expect(speechCacheKey({ ...request, text: 'Hello Dan!' })).not.toBe(key)
    expect(speechCacheKey({ ...request, voiceId: 'voice-2' })).not.toBe(key)
    expect(speechCacheKey({ ...request, model: 'eleven-v3' })).not.toBe(key)
    expect(speechCacheKey(speechRequest('Hello Dan.', VOICE_ID, { ...CONFIG, baseUrl: 'https://other.test' }))).not.toBe(key)
  })
})
