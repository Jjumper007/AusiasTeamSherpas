import { briefFixture, factsFixture, scriptFixture } from '@sherpas/shared'
import { describe, expect, test } from 'vitest'
import { BAND_COLORS, COLORS } from '../locked/tokens'
import { burstsFor } from './bursts'
import { companionsOf, ctaButtonLabel, joinNames, partnerOf, pillarTone, spreadReveals } from './content'

describe('joinNames', () => {
  test('joins one, two or more names in plain English', () => {
    expect(joinNames(['Emily'])).toBe('Emily')
    expect(joinNames(['Emily', 'Oliver'])).toBe('Emily and Oliver')
    expect(joinNames(['Emily', 'Oliver', 'Sophia'])).toBe('Emily, Oliver and Sophia')
  })
})

describe('household', () => {
  test('companions are everyone but the member, children included', () => {
    expect(companionsOf(briefFixture)).toEqual(['Emily', 'Oliver', 'Sophia'])
  })

  test('the partner is the other adult', () => {
    expect(partnerOf(briefFixture)).toBe('Emily')
  })

  test('someone living alone has no partner', () => {
    const alone = { ...briefFixture, household: briefFixture.household.filter((person) => person.firstName === 'Daniel') }

    expect(partnerOf(alone)).toBeNull()
  })
})

describe('ctaButtonLabel', () => {
  test('matches the action of the card under the video for each decision style', () => {
    expect(ctaButtonLabel('just_do_it', 'Emily')).toBe('Start now')
    expect(ctaButtonLabel('research_first', 'Emily')).toBe('Why this number?')
    expect(ctaButtonLabel('ask_trusted', 'Emily')).toBe('Send this to Emily')
    expect(ctaButtonLabel('ask_trusted', null)).toBe('Send this to someone you trust')
    expect(ctaButtonLabel('wait', 'Emily')).toBe('Remind me')
  })
})

describe('pillarTone', () => {
  test('rates an area by its share of the maximum points', () => {
    expect(pillarTone(13, 15)).toBe('strong')
    expect(pillarTone(8, 15)).toBe('middle')
    expect(pillarTone(0, 20)).toBe('weak')
    expect(pillarTone(3, 0)).toBe('weak')
  })
})

describe('spreadReveals', () => {
  test('spreads reveals between a tenth and two thirds of the scene', () => {
    expect(spreadReveals(3, 300)).toEqual([30, 113, 195])
  })

  test('a single reveal comes early', () => {
    expect(spreadReveals(1, 300)).toEqual([30])
  })
})

describe('burstsFor', () => {
  test('stamps the score band and the points the first step adds', () => {
    // Arrange
    const props = { brief: briefFixture, facts: factsFixture, script: scriptFixture }

    // Act
    const bursts = burstsFor(props)

    // Assert
    expect(bursts.map(({ sceneIndex, text }) => ({ sceneIndex, text }))).toEqual([
      { sceneIndex: 1, text: 'Vulnerable' },
      { sceneIndex: 4, text: '+5 points' },
    ])
    expect(bursts.map((burst) => burst.color)).toEqual([BAND_COLORS.vulnerable, COLORS.success])
  })

  test('adds no gain stamp when the last scene declares no before and after', () => {
    const scenes = scriptFixture.scenes.map((scene) =>
      scene.part === 'what_changes' ? { ...scene, factsUsed: [] } : scene,
    ) as unknown as typeof scriptFixture.scenes
    const props = { brief: briefFixture, facts: factsFixture, script: { ...scriptFixture, scenes } }

    expect(burstsFor(props).map((burst) => burst.text)).toEqual(['Vulnerable'])
  })
})
