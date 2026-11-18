import { describe, expect, test } from 'vitest'
import type { Facts } from '../facts'
import { factsFixture } from '../fixtures/facts.daniel'
import { scriptFixture } from '../fixtures/script.daniel'
import { validateNarration } from './validate'

const facts: Facts = factsFixture

const numbersRejected = (text: string): readonly string[] =>
  validateNarration(text, facts).errors.map((error) => error.number)

describe('validateNarration: accepted figures', () => {
  test('accepts fmt roundings of facts', () => {
    const text =
      "Your retirement gap is $1.4M in today's dollars. Closing it takes about $34K more a year, and your free cash flow is $15K."
    expect(validateNarration(text, facts)).toEqual({ ok: true, errors: [] })
  })

  test('accepts exact fact values, with or without separators and cents', () => {
    expect(numbersRejected('The gap is $1,427,456.')).toEqual([])
    expect(numbersRejected('The gap is $1,427,455.89 exactly.')).toEqual([])
    expect(numbersRejected('The gap is 1427455.89.')).toEqual([])
    expect(numbersRejected('Daniel has $250,000 of life cover today.')).toEqual([])
  })

  test('accepts a rounding written out in words or in full', () => {
    expect(numbersRejected('The gap is 1.4 million dollars.')).toEqual([])
    expect(numbersRejected('It takes about $34,000 more a year.')).toEqual([])
    expect(numbersRejected('It takes about $34k more a year.')).toEqual([])
  })

  test('accepts percent facts as a whole percent or as the exact percentage', () => {
    expect(numbersRejected('Income covers 49% of your need.')).toEqual([])
    expect(numbersRejected('Income covers 49.28% of your need.')).toEqual([])
  })

  test('accepts calendar years that are facts', () => {
    expect(numbersRejected('The summit, retirement in 2044, is 17 years up the trail.')).toEqual([])
  })

  test('always allows numbers of one or two digits', () => {
    expect(numbersRejected('In 3 steps you gain 12 points, about 7.5 a year, or 99%.')).toEqual([])
  })

  test('allows the score scale of 100 and retirement plan names', () => {
    expect(numbersRejected('You stand at 52 out of 100.')).toEqual([])
    expect(numbersRejected('Max out your 401(k) and your 401k match first.')).toEqual([])
  })
})

describe('validateNarration: rejected figures', () => {
  test('rejects a wrong rounding of a fact', () => {
    expect(numbersRejected('Your retirement gap is $1.5M.')).toEqual(['$1.5M'])
    expect(numbersRejected('Closing it takes $35K a year.')).toEqual(['$35K'])
    expect(numbersRejected('The gap is 1.5 million dollars.')).toEqual(['1.5 million'])
    expect(numbersRejected('The gap is $1.5m.')).toEqual(['$1.5m'])
    expect(numbersRejected('A gap of 1.5 millions.')).toEqual(['1.5 millions'])
  })

  test('rejects a rounding in a scale fmt does not produce', () => {
    expect(numbersRejected('The gap is $1,427K.')).toEqual(['$1,427K'])
  })

  test('rejects invented numbers', () => {
    expect(numbersRejected('You could save $500,000 by 2044.')).toEqual(['$500,000'])
    expect(numbersRejected('That is 1250 dollars a month.')).toEqual(['1250'])
    expect(numbersRejected('Income covers 49.5% of your need.')).toEqual(['49.5%'])
  })

  test('rejects calendar years that are not facts', () => {
    expect(numbersRejected('You retire in 2045.')).toEqual(['2045'])
  })

  test('reports every bad number, in order', () => {
    expect(numbersRejected('From $1.5M down to $300K by 2050.')).toEqual(['$1.5M', '$300K', '2050'])
  })

  test('never throws on empty text or empty facts', () => {
    expect(validateNarration('', facts)).toEqual({ ok: true, errors: [] })
    const result = validateNarration('The gap is $1.5M.', {})
    expect(result.ok).toBe(false)
    expect(result.errors[0]?.nearestFact).toBeNull()
  })
})

describe('validateNarration: errors', () => {
  test('says which number, where, and which fact was expected', () => {
    const text = 'Here are the numbers.\nYour retirement gap is $1.5M today.'
    const [error] = validateNarration(text, facts).errors

    expect(error).toMatchObject({
      number: '$1.5M',
      value: 1500000,
      line: 2,
      column: 24,
      nearestFact: {
        name: 'RETIREMENT_GAP',
        value: 1427455.89,
        unit: 'usd',
        acceptedForms: ['$1.4M', '$1,427,456'],
      },
    })
    expect(error?.snippet).toContain('gap is $1.5M today')
    expect(error?.message).toBe(
      'Number "$1.5M" at line 2, column 24 does not come from facts. ' +
        'Nearest fact: RETIREMENT_GAP = 1427455.89 (usd). ' +
        'Write it as "$1.4M" or "$1,427,456". ' +
        'Context: "Your retirement gap is $1.5M today."',
    )
  })

  test('suggests the percent form for a percent fact', () => {
    const [error] = validateNarration('Income covers 49.5% of your need.', facts).errors
    expect(error?.nearestFact).toMatchObject({
      name: 'RETIREMENT_INCOME_SHARE_OF_NEED',
      acceptedForms: ['49%'],
    })
  })
})

describe('validateNarration: Daniel fixture', () => {
  test('every scene narration passes', () => {
    for (const scene of scriptFixture.scenes) {
      expect(validateNarration(scene.narration, facts), scene.part).toEqual({ ok: true, errors: [] })
    }
  })

  test('every chapter title and body passes', () => {
    for (const chapter of scriptFixture.chapters) {
      const text = `${chapter.title}\n${chapter.body}`
      expect(validateNarration(text, facts), chapter.title).toEqual({ ok: true, errors: [] })
    }
  })

  test('the call to action passes', () => {
    expect(validateNarration(scriptFixture.cta.text, facts).ok).toBe(true)
  })
})
