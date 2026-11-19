/// <reference types="node" />
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { videoPropsFixture } from '@sherpas/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRunFolder } from '../pipeline/run-folder'
import { createNarrator, createSceneRecorder } from './narrate'
import { fakeMp3, fakeSpokenWords, FRAME_SEC } from './test-helpers'

const ENV = { LLM_PROXY_URL: 'https://proxy.test', LLM_PROXY_KEY: 'sk-test-secret', ELEVENLABS_VOICE_ID: 'voice-1' }
const RUNS_URL = 'http://localhost:3017/runs'
/** 300 frames ≈ 7.84 s of audio per scene. */
const FRAMES = 300
const SPEECH_AND_TRANSCRIPTION = 2
const script = videoPropsFixture.script
const narration = script.scenes[2].narration

const dirs: string[] = []
const tempDir = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'sherpas-record-'))
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
    const words = fakeSpokenWords(lastText.toLowerCase(), 0.2).map((word) => ({ word: word.text, start: word.startSec, end: word.endSec }))
    return Response.json({ text: lastText, words })
  })
}

const setup = (env: Readonly<Record<string, string | undefined>> = ENV) => {
  const fetchFn = fakeProxy()
  const options = { env, cacheDir: tempDir(), runsUrl: RUNS_URL, fetchFn }
  const runsDir = tempDir()
  const folder = (second: number) => createRunFolder(runsDir, 'case', 'member', new Date(Date.UTC(2026, 10, 18, 0, 0, second)))
  return { options, folder, fetchFn }
}

/** log.txt without the timestamp at the start of each line. */
const logLines = (file: string): string[] =>
  readFileSync(file, 'utf8')
    .trim()
    .split('\n')
    .map((line) => line.replace(/^\S+ /, ''))

describe('createSceneRecorder', () => {
  it('records one scene into audio/scene-N.mp3 and returns its timing, URL and captions', async () => {
    // Arrange
    const { options, folder, fetchFn } = setup()
    const run = folder(0)
    const record = createSceneRecorder(options)

    // Act
    const voiced = await record(narration, 2, run)

    // Assert
    expect(readdirSync(run.path('audio'))).toEqual(['scene-3.mp3'])
    expect(voiced.audioFile).toBe(`${RUNS_URL}/${run.runId}/audio/scene-3.mp3`)
    expect(voiced.audioSec).toBeGreaterThanOrEqual(FRAMES * FRAME_SEC)
    expect(voiced.captions.map((cue) => cue.text).join(' ')).toBe(narration)
    expect(voiced.fromCache).toBe(false)
    expect(fetchFn).toHaveBeenCalledTimes(SPEECH_AND_TRANSCRIPTION)
    expect(logLines(run.path('log.txt'))).toEqual([`[voice] audio/scene-3.mp3: ${voiced.audioSec.toFixed(2)} s, from the proxy`])
  })

  it('serves the same narration from the cache in a later run, without calling the proxy again', async () => {
    // Arrange
    const { options, folder, fetchFn } = setup()
    const record = createSceneRecorder(options)
    const first = await record(narration, 2, folder(0))

    // Act
    const secondRun = folder(1)
    const second = await record(narration, 2, secondRun)

    // Assert
    expect(fetchFn).toHaveBeenCalledTimes(SPEECH_AND_TRANSCRIPTION)
    expect(second).toEqual({ ...first, audioFile: `${RUNS_URL}/${secondRun.runId}/audio/scene-3.mp3`, fromCache: true })
    expect(logLines(secondRun.path('log.txt'))).toEqual([`[voice] audio/scene-3.mp3: ${second.audioSec.toFixed(2)} s, from cache`])
  })

  it('records several scenes of one run at the same time, each into its own file', async () => {
    // Arrange
    const { options, folder } = setup()
    const run = folder(0)
    const record = createSceneRecorder(options)

    // Act
    const voiced = await Promise.all(script.scenes.slice(0, 3).map((scene, index) => record(scene.narration, index, run)))

    // Assert
    expect([1, 2, 3].filter((n) => !existsSync(run.path(`audio/scene-${n}.mp3`)))).toEqual([])
    expect(voiced.map((scene) => scene.audioFile.split('/').at(-1))).toEqual(['scene-1.mp3', 'scene-2.mp3', 'scene-3.mp3'])
  })

  it('fails clearly when the voice is missing, before calling the proxy or writing audio', async () => {
    // Arrange
    const { options, folder, fetchFn } = setup({ ...ENV, ELEVENLABS_VOICE_ID: undefined })
    const run = folder(0)
    const record = createSceneRecorder(options)

    // Act
    const recording = record(narration, 0, run)

    // Assert
    await expect(recording).rejects.toThrow(/ELEVENLABS_VOICE_ID is not set/)
    expect(fetchFn).not.toHaveBeenCalled()
    expect(existsSync(run.path('audio'))).toBe(false)
  })
})

describe('createNarrator over the scene recorder', () => {
  it('logs one line per scene in script order, then the summary, as before', async () => {
    // Arrange
    const { options, folder } = setup()
    const run = folder(0)
    const narrate = createNarrator(options)

    // Act
    await narrate(script, run, () => undefined)

    // Assert
    const lines = logLines(run.path('log.txt'))
    expect(lines.slice(0, 5).map((line) => line.replace(/: [\d.]+ s,/, ': N s,'))).toEqual(
      [1, 2, 3, 4, 5].map((n) => `[voice] audio/scene-${n}.mp3: N s, from the proxy`),
    )
    expect(lines.slice(5)).toEqual(['[voice] 5 scenes: 0 from cache, 5 from the proxy (voice voice-1)'])
    expect(readdirSync(run.path('audio')).sort()).toEqual([1, 2, 3, 4, 5].map((n) => `scene-${n}.mp3`))
  })
})
