import { describe, expect, test } from 'vitest'
import {
  BriefSchema,
  FactsSchema,
  PARTS,
  ScriptSchema,
  SurveySchema,
  VideoPropsSchema,
  briefFixture,
  factsFixture,
  scriptFixture,
  videoPropsFixture,
} from './index'

const MIN_VIDEO_SECONDS = 60
const MAX_VIDEO_SECONDS = 120

const validSurvey = {
  nickname: 'Dan',
  explainLevel: 'nerd',
  topOfMind: 'retirement',
  decisionStyle: 'research_first',
}

describe('SurveySchema', () => {
  test('accepts a complete survey', () => {
    expect(SurveySchema.parse(validSurvey)).toEqual(validSurvey)
  })

  test('rejects a topic outside the closed list', () => {
    const result = SurveySchema.safeParse({ ...validSurvey, topOfMind: 'crypto' })

    expect(result.success).toBe(false)
  })

  test('rejects more than one topic', () => {
    const result = SurveySchema.safeParse({ ...validSurvey, topOfMind: ['retirement', 'debt'] })

    expect(result.success).toBe(false)
  })

  test('rejects an empty nickname', () => {
    const result = SurveySchema.safeParse({ ...validSurvey, nickname: '  ' })

    expect(result.success).toBe(false)
  })
})

describe('FactsSchema', () => {
  test('accepts named facts with value, unit and label', () => {
    const facts = { SCORE_NOW: { value: 52, unit: 'points', label: 'Current score' } }

    expect(FactsSchema.parse(facts)).toEqual(facts)
  })

  test('rejects a fact name that is not SCREAMING_SNAKE_CASE', () => {
    const result = FactsSchema.safeParse({
      scoreNow: { value: 52, unit: 'points', label: 'Current score' },
    })

    expect(result.success).toBe(false)
  })

  test('rejects a fact without a unit', () => {
    const result = FactsSchema.safeParse({ SCORE_NOW: { value: 52, label: 'Current score' } })

    expect(result.success).toBe(false)
  })

  test('rejects a non-numeric value', () => {
    const result = FactsSchema.safeParse({
      SCORE_NOW: { value: '52', unit: 'points', label: 'Current score' },
    })

    expect(result.success).toBe(false)
  })
})

describe('ScriptSchema', () => {
  test('accepts the fixture script', () => {
    expect(ScriptSchema.safeParse(scriptFixture).success).toBe(true)
  })

  test('keeps the five parts in the fixed arc order', () => {
    expect(scriptFixture.scenes.map((scene) => scene.part)).toEqual([...PARTS])
  })

  test('rejects a script with four scenes', () => {
    const result = ScriptSchema.safeParse({
      ...scriptFixture,
      scenes: scriptFixture.scenes.slice(0, 4),
    })

    expect(result.success).toBe(false)
  })

  test('rejects a script with six scenes', () => {
    const result = ScriptSchema.safeParse({
      ...scriptFixture,
      scenes: [...scriptFixture.scenes, scriptFixture.scenes[4]],
    })

    expect(result.success).toBe(false)
  })

  test('rejects scenes out of arc order', () => {
    const [hook, whereYouAre, ...rest] = scriptFixture.scenes

    const result = ScriptSchema.safeParse({
      ...scriptFixture,
      scenes: [whereYouAre, hook, ...rest],
    })

    expect(result.success).toBe(false)
  })

  test('rejects a script without exactly five chapters', () => {
    const result = ScriptSchema.safeParse({
      ...scriptFixture,
      chapters: scriptFixture.chapters.slice(0, 4),
    })

    expect(result.success).toBe(false)
  })

  test('rejects a call to action with an unknown decision style', () => {
    const result = ScriptSchema.safeParse({
      ...scriptFixture,
      cta: { type: 'yolo', text: 'Go' },
    })

    expect(result.success).toBe(false)
  })
})

describe('BriefSchema', () => {
  test('accepts the fixture brief', () => {
    expect(BriefSchema.safeParse(briefFixture).success).toBe(true)
  })

  test('rejects a child as the member the video is for', () => {
    const result = BriefSchema.safeParse({
      ...briefFixture,
      member: { ...briefFixture.member, role: 'child' },
    })

    expect(result.success).toBe(false)
  })

  test('rejects a score without exactly five pillars', () => {
    const result = BriefSchema.safeParse({
      ...briefFixture,
      score: { ...briefFixture.score, pillars: briefFixture.score.pillars.slice(0, 4) },
    })

    expect(result.success).toBe(false)
  })
})

describe('VideoPropsSchema', () => {
  test('accepts the fixture video props', () => {
    expect(VideoPropsSchema.safeParse(videoPropsFixture).success).toBe(true)
  })

  test('rejects a scene with a non-positive duration', () => {
    const [first, ...rest] = videoPropsFixture.scenes

    const result = VideoPropsSchema.safeParse({
      ...videoPropsFixture,
      scenes: [{ ...first, durationSec: 0 }, ...rest],
    })

    expect(result.success).toBe(false)
  })

  test('rejects timings for fewer than five scenes', () => {
    const result = VideoPropsSchema.safeParse({
      ...videoPropsFixture,
      scenes: videoPropsFixture.scenes.slice(0, 4),
    })

    expect(result.success).toBe(false)
  })
})

describe('fixtures are consistent with each other', () => {
  test('the facts fixture validates', () => {
    expect(FactsSchema.safeParse(factsFixture).success).toBe(true)
  })

  test('every fact a scene uses exists in the facts fixture', () => {
    const usedFacts = scriptFixture.scenes.flatMap((scene) => scene.factsUsed)

    const missing = usedFacts.filter((name) => !(name in factsFixture))

    expect(usedFacts.length).toBeGreaterThan(0)
    expect(missing).toEqual([])
  })

  test('the call to action matches the decision style from the survey', () => {
    expect(scriptFixture.cta.type).toBe(briefFixture.survey.decisionStyle)
  })

  test('the fixture video lasts between 60 and 120 seconds', () => {
    const totalSeconds = videoPropsFixture.scenes.reduce(
      (total, scene) => total + scene.durationSec,
      0,
    )

    expect(totalSeconds).toBeGreaterThanOrEqual(MIN_VIDEO_SECONDS)
    expect(totalSeconds).toBeLessThanOrEqual(MAX_VIDEO_SECONDS)
  })
})
