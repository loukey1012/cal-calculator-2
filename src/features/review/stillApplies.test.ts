import { describe, expect, test } from 'vitest'
import { ingredient } from '../ingredients/testData'
import { findingStillApplies } from './stillApplies'
import { finding } from './testData'

const BEFORE = '2026-10-10T08:00:00+00:00'
const AFTER = '2026-10-20T08:00:00+00:00'
const OTHER_ID = '6f1c3a52-3a0e-4f6c-9b0e-1d2f3a4b5c6d'

const changed = (overrides = {}) => ingredient({ id: 'i1', updated_at: AFTER, ...overrides })
const mapOf = (...list: ReturnType<typeof ingredient>[]) => new Map(list.map((i) => [i.id, i]))

describe('findingStillApplies', () => {
  test('hides a finding whose suggested fix is already in, after a later change', () => {
    const butter = changed({ name: 'Butter' })
    const f = finding({ suggestion: { name: 'Butter' } })
    expect(findingStillApplies(f, butter, mapOf(butter))).toBe(false)
  })

  test('shows it when the ingredient has not been changed since the finding', () => {
    const butter = changed({ name: 'Butter', updated_at: BEFORE })
    const f = finding({ suggestion: { name: 'Butter' } })
    expect(findingStillApplies(f, butter, mapOf(butter))).toBe(true)
  })

  test('shows it when the fix would still change something', () => {
    const butter = changed({ name: 'Buter' })
    const f = finding({ suggestion: { name: 'Butter' } })
    expect(findingStillApplies(f, butter, mapOf(butter))).toBe(true)
  })

  test('shows it when only part of the fix is in', () => {
    const butter = changed({ name: 'Butter', kcal_100: 700 })
    const f = finding({ suggestion: { name: 'Butter', kcal_100: 740 } })
    expect(findingStillApplies(f, butter, mapOf(butter))).toBe(true)
  })

  test('an unusable suggestion never hides a finding', () => {
    const butter = changed({ name: 'Butter' })
    const f = finding({ suggestion: { name: 'Butter', kcal_100: -5 } })
    expect(findingStillApplies(f, butter, mapOf(butter))).toBe(true)
  })

  test('hides a duplicate whose other ingredient is gone', () => {
    const butter = changed()
    const f = finding({ kind: 'duplicate', suggestion: { duplicate_of: OTHER_ID } })
    expect(findingStillApplies(f, butter, mapOf(butter))).toBe(false)
  })

  test('shows a duplicate whose other ingredient exists, or that is unchanged', () => {
    const butter = changed()
    const other = ingredient({ id: OTHER_ID })
    const f = finding({ kind: 'duplicate', suggestion: { duplicate_of: OTHER_ID } })
    expect(findingStillApplies(f, butter, mapOf(butter, other))).toBe(true)
    const unchanged = changed({ updated_at: BEFORE })
    expect(findingStillApplies(f, unchanged, mapOf(unchanged))).toBe(true)
  })

  test('shows an old duplicate finding without a named other ingredient', () => {
    const butter = changed()
    const f = finding({ kind: 'duplicate', suggestion: {} })
    expect(findingStillApplies(f, butter, mapOf(butter))).toBe(true)
  })

  test('a values finding without a fix stays even when no local check warns any more', () => {
    // the review may flag a plausible-looking but wrong value; an unrelated edit must not hide it
    const butter = changed({ kcal_100: 740, fat_100: 82, carbs_100: 0.6, protein_100: 0.7 })
    const f = finding({ kind: 'values', suggestion: {} })
    expect(findingStillApplies(f, butter, mapOf(butter))).toBe(true)
  })

  test('shows a values finding without a fix when the ingredient is unchanged', () => {
    const butter = changed({ kcal_100: 740, updated_at: BEFORE })
    const f = finding({ kind: 'values', suggestion: {} })
    expect(findingStillApplies(f, butter, mapOf(butter))).toBe(true)
  })

  test('other kinds without a fix stay', () => {
    const butter = changed()
    const f = finding({ kind: 'typo', suggestion: {} })
    expect(findingStillApplies(f, butter, mapOf(butter))).toBe(true)
  })

  test('an unreadable date never hides a finding', () => {
    const butter = changed({ name: 'Butter', updated_at: 'not a date' })
    const f = finding({ suggestion: { name: 'Butter' } })
    expect(findingStillApplies(f, butter, mapOf(butter))).toBe(true)
  })

  test('meal findings are never hidden', () => {
    const butter = changed({ name: 'Butter' })
    const f = finding({ kind: 'low_day', ingredient_id: null, suggestion: { name: 'Butter' } })
    expect(findingStillApplies(f, butter, mapOf(butter))).toBe(true)
  })
})
