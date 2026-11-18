/// <reference types="node" />
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { SurveyAnswers } from '../api/types'
import { loadCase } from '../brief/case-loader'
import { generateCaseOutputs } from '../brief/generate'
import { loadEnvFile } from '../env'
import { RUNS_DIR, SPEECH_CACHE_DIR } from '../paths'
import { buildFallbackScript } from '../script/fallback-script'
import { findAdult } from '../survey/members'
import { resolveSurvey } from '../survey/resolve-survey'
import { createSpeechCache, speak } from './speech-cache'
import { createProxySynthesizer, readProxyConfig, speechRequest } from './speech-proxy'

/**
 * Renders the same lines with every candidate brand voice (#7), to listen to them side by side before
 * fixing ELEVENLABS_VOICE_ID. Spends team proxy credit on the first run (cached afterwards).
 *
 *   npm run voice:audition -w backend   →   runs/voice-audition/<voice>-<member>.mp3
 */

/** Default ElevenLabs voices, American English and warm. "Daniel" is avoided: British, and the client's name. */
const CANDIDATE_VOICES = [
  { name: 'matilda', id: 'XrExE9yKIg1WjnnlVkGX' },
  { name: 'eric', id: 'cjVigY5qzO86Huf0OWal' },
  { name: 'sarah', id: 'EXAVITQu4vr4xnSDxMaL' },
  { name: 'chris', id: 'iP95p4xoKVk53GoZ742B' },
] as const

const CASE_ID = 'daniel-emily-johnson'
/** The hook of each adult's fallback script, with different topics so the two lines differ. */
const LINES: ReadonlyArray<{ readonly member: string; readonly answers: SurveyAnswers }> = [
  { member: 'daniel', answers: { topOfMind: 'retirement' } },
  { member: 'emily', answers: { topOfMind: 'protection' } },
]
const AUDITION_DIR = join(RUNS_DIR, 'voice-audition')
const EXIT_FAILURE = 1

const hookLine = (member: string, answers: SurveyAnswers): string => {
  const caseData = loadCase(CASE_ID)
  const adult = findAdult(caseData, member)
  const outputs = generateCaseOutputs(caseData, adult.firstName, resolveSurvey(caseData, adult, answers))
  return buildFallbackScript(outputs.brief, outputs.facts).scenes[0].narration
}

const main = async (): Promise<void> => {
  loadEnvFile()
  const config = readProxyConfig(process.env)
  const synthesize = createProxySynthesizer(config)
  const cache = createSpeechCache(SPEECH_CACHE_DIR)
  const lines = LINES.map(({ member, answers }) => ({ member, text: hookLine(member, answers) }))
  mkdirSync(AUDITION_DIR, { recursive: true })

  for (const voice of CANDIDATE_VOICES) {
    for (const line of lines) {
      const { speech, fromCache } = await speak(speechRequest(line.text, voice.id, config), cache, synthesize)
      const file = join(AUDITION_DIR, `${voice.name}-${line.member}.mp3`)
      writeFileSync(file, speech.audio)
      console.log(`${file}${fromCache ? ' (cached)' : ''}: "${line.text}"`)
    }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(EXIT_FAILURE)
})
