/// <reference types="node" />
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import type { Speech, SpeechRequest, Synthesize } from './speech-proxy'

/**
 * Speech cached on disk by a hash of everything that decides the audio (proxy, model, voice, text),
 * shared by every run, so saying the same text again costs no credit.
 * Each entry is `<key>.mp3` plus `<key>.json` with the word timestamps.
 */

/** Bump to drop every cached entry, e.g. if the stored timestamps change shape. 2: words from Scribe. */
const CACHE_VERSION = 2
const AUDIO_EXTENSION = '.mp3'
const WORDS_EXTENSION = '.json'

const WordsSchema = z.array(z.object({ text: z.string(), startSec: z.number(), endSec: z.number() }))

export const speechCacheKey = (request: SpeechRequest): string =>
  createHash('sha256')
    .update(
      JSON.stringify({
        version: CACHE_VERSION,
        proxyHost: request.proxyHost,
        model: request.model,
        voiceId: request.voiceId,
        text: request.text,
      }),
    )
    .digest('hex')

export interface SpeechCache {
  read(key: string): Speech | undefined
  write(key: string, speech: Speech): void
}

/** Writes through a temporary name, so a crash never leaves half a file behind under the real one. */
const writeAtomically = (file: string, data: string | Uint8Array): void => {
  const temporary = `${file}.${process.pid}.tmp`
  writeFileSync(temporary, data)
  renameSync(temporary, file)
}

/** The parsed file, or undefined when it is not valid JSON. */
const readJson = (file: string): unknown => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return undefined
  }
}

export const createSpeechCache =(dir: string): SpeechCache => {
  const audioFile = (key: string): string => join(dir, `${key}${AUDIO_EXTENSION}`)
  const wordsFile = (key: string): string => join(dir, `${key}${WORDS_EXTENSION}`)
  return {
    read: (key) => {
      if (!existsSync(audioFile(key)) || !existsSync(wordsFile(key))) return undefined
      const words = WordsSchema.safeParse(readJson(wordsFile(key)))
      // A damaged entry is a miss: the text is synthesized again and the entry rewritten.
      if (!words.success) return undefined
      return { audio: readFileSync(audioFile(key)), words: words.data }
    },
    write: (key, speech) => {
      mkdirSync(dir, { recursive: true })
      writeAtomically(audioFile(key), speech.audio)
      writeAtomically(wordsFile(key), JSON.stringify(speech.words))
    },
  }
}

export interface SpokenText {
  readonly speech: Speech
  readonly fromCache: boolean
}

/** The speech for `request`: from the cache when it is there, otherwise synthesized and cached. */
export const speak = async (request: SpeechRequest, cache: SpeechCache, synthesize: Synthesize): Promise<SpokenText> => {
  const key = speechCacheKey(request)
  const cached = cache.read(key)
  if (cached) return { speech: cached, fromCache: true }
  const speech = await synthesize(request)
  cache.write(key, speech)
  return { speech, fromCache: false }
}
