import { describe, expect, test } from 'vitest'
import { checkFindings } from './findings'

const BUTTER = '7d3c5f8e-1b2a-4c3d-9e8f-0a1b2c3d4e5f'
const IDS = new Set([BUTTER])
const TYPO = {
  ingredient_id: BUTTER,
  kind: 'typo',
  message: 'The name looks misspelled.',
  suggestion: { name: 'Butter' },
}

describe('checkFindings', () => {
  test('passes valid findings through', () => {
    expect(checkFindings([TYPO], IDS)).toEqual([TYPO])
  })

  test('a finding without a fix gets an empty one', () => {
    const { suggestion: _, ...noFix } = TYPO

    expect(checkFindings([{ ...noFix, kind: 'duplicate' }], IDS)[0]?.suggestion).toEqual({})
  })

  test('lists every problem at once, by position', () => {
    expect(() =>
      checkFindings(
        [
          { ...TYPO, ingredient_id: 'not-ours' },
          { ...TYPO, kind: 'spelling' },
          { ...TYPO, message: '' },
          { ...TYPO, suggestion: { household_id: 'x' } },
          { ...TYPO, suggestion: { kcal_100: { a: 1 } } },
        ],
        IDS,
      ),
    ).toThrow(
      [
        '#1: ingredient_id is not one of the household’s ingredients',
        '#2: kind must be one of typo, brand, unit_name, unit_weight, duplicate, values, other',
        '#3: message must be 1–500 characters',
        '#4: suggestion field household_id can’t be changed',
        '#5: suggestion value for kcal_100 must be text, a number or null',
      ].join('\n'),
    )
  })

  test('takes a list of at most 100', () => {
    expect(() => checkFindings({ findings: [] }, IDS)).toThrow('a list')
    expect(() =>
      checkFindings(
        Array.from({ length: 101 }, () => TYPO),
        IDS,
      ),
    ).toThrow('100')
  })
})
