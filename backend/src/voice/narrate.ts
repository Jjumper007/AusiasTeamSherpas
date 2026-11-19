/// <reference types="node" />
import { mkdirSync, writeFileSync } from 'node:fs'
import { VideoPropsSchema, type Caption, type Script, type VideoProps } from '@sherpas/shared'
import type { RunFolder } from '../pipeline/run-folder'
import { cuesFromWords } from './captions'
import { mp3DurationSec } from './mp3-duration'
import { durationWarnings, sceneDurations } from './scene-durations'
import { createSpeechCache, speak } from './speech-cache'
import { createProxySynthesizer, readProxyConfig, readVoiceId, speechRequest, type Env } from './speech-proxy'
import { timeScriptWords } from './word-alignment'

/**
 * [3] The narration (SPEC §5.3): one audio per scene, saved as `audio/scene-N.mp3` in the run folder.
 * The audio fixes how long each scene lasts, and its word timestamps time the captions.
 */

/** Reports how many scenes are voiced so far (0–1). */
export type NarrationProgress = (fraction: number) => void

/** Voices a script into the run folder and returns one timing per scene for the video. */
export type Narrate = (script: Script, folder: RunFolder, onProgress: NarrationProgress) => Promise<VideoProps['scenes']>

export interface NarratorOptions {
  /** Read on every job, so a missing proxy key or voice fails the voice step, not the server start. */
  readonly env: Env
  /** Speech cache shared by every run. */
  readonly cacheDir: string
  /** Where the render fetches the run folders: `http://localhost:<port>/runs`. */
  readonly runsUrl: string
  readonly fetchFn?: typeof fetch
}

const AUDIO_DIR = 'audio'

const audioFileName = (sceneIndex: number): string => `${AUDIO_DIR}/scene-${sceneIndex + 1}.mp3`

/** One scene's voice: what the video needs of it once every scene is recorded. */
export interface VoicedScene {
  /** Length of the audio; `sceneDurations` turns the five of them into scene lengths. */
  readonly audioSec: number
  /** URL the render (or the Live run's player) fetches the MP3 from. */
  readonly audioFile: string
  readonly captions: Caption[]
  readonly fromCache: boolean
}

/**
 * Records one scene's narration into `audio/scene-<sceneIndex + 1>.mp3` of the run folder. The Live
 * run records each scene as soon as its narration is accepted, several at the same time.
 */
export type RecordScene = (narration: string, sceneIndex: number, folder: RunFolder) => Promise<VoicedScene>

/** The proxy, the brand voice and the cache, read from `options` before anything is called. */
interface Voice {
  readonly voiceId: string
  readonly record: RecordScene
}

const openVoice = (options: NarratorOptions): Voice => {
  const config = readProxyConfig(options.env)
  const voiceId = readVoiceId(options.env)
  const synthesize = createProxySynthesizer(config, options.fetchFn)
  const cache = createSpeechCache(options.cacheDir)
  const record: RecordScene = async (narration, sceneIndex, folder) => {
    mkdirSync(folder.path(AUDIO_DIR), { recursive: true })
    const { speech, fromCache } = await speak(speechRequest(narration, voiceId, config), cache, synthesize)
    const fileName = audioFileName(sceneIndex)
    writeFileSync(folder.path(fileName), speech.audio)
    const audioSec = Math.max(mp3DurationSec(speech.audio), speech.words.at(-1)?.endSec ?? 0)
    folder.log(`[voice] ${fileName}: ${audioSec.toFixed(2)} s, ${fromCache ? 'from cache' : 'from the proxy'}`)
    return {
      audioSec,
      audioFile: `${options.runsUrl}/${folder.runId}/${fileName}`,
      captions: cuesFromWords(timeScriptWords(narration, speech.words, audioSec)),
      fromCache,
    }
  }
  return { voiceId, record }
}

/** Reads the proxy and the voice on every call, so a missing key fails that recording, not the server start. */
export const createSceneRecorder =
  (options: NarratorOptions): RecordScene =>
  async (narration, sceneIndex, folder) =>
    openVoice(options).record(narration, sceneIndex, folder)

/** Runs `work` on each item one after the other: the proxy allows 60 requests a minute. */
const mapSequential = async <T, R>(items: readonly T[], work: (item: T, index: number) => Promise<R>): Promise<R[]> =>
  items.reduce<Promise<R[]>>(async (done, item, index) => [...(await done), await work(item, index)], Promise.resolve([]))

export const createNarrator =
  (options: NarratorOptions): Narrate =>
  async (script, folder, onProgress) => {
    const { voiceId, record } = openVoice(options)

    const voiced = await mapSequential(script.scenes, async (scene, index): Promise<VoicedScene> => {
      const voicedScene = await record(scene.narration, index, folder)
      onProgress((index + 1) / script.scenes.length)
      return voicedScene
    })

    const durations = sceneDurations(voiced.map((scene) => scene.audioSec))
    const cached = voiced.filter((scene) => scene.fromCache).length
    const fresh = voiced.length - cached
    folder.log(`[voice] ${voiced.length} scenes: ${cached} from cache, ${fresh} from the proxy (voice ${voiceId})`)
    durationWarnings(durations).forEach((warning) => folder.log(`[voice] warning: ${warning}`))

    return VideoPropsSchema.shape.scenes.parse(
      voiced.map((scene, index) => ({ durationSec: durations[index], audioFile: scene.audioFile, captions: scene.captions })),
    )
  }
