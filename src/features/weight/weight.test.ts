import { describe, expect, test } from 'vitest'
import {
  formatKg,
  parseWeight,
  weightOn,
  withWeightRemoved,
  withWeightSaved,
  type WeightEntry,
} from './weight'

const ENTRIES: readonly WeightEntry[] = [
  { date: '2026-09-20', weightKg: 73.2 },
  { date: '2026-10-01', weightKg: 72.4 },
  { date: '2026-10-05', weightKg: 71.9 },
]

describe('weightOn', () => {
  test('a weight counts from its day until the next entry', () => {
    expect(weightOn(ENTRIES, '2026-10-01')).toEqual(ENTRIES[1])
    expect(weightOn(ENTRIES, '2026-10-04')).toEqual(ENTRIES[1])
    expect(weightOn(ENTRIES, '2026-12-31')).toEqual(ENTRIES[2])
  })

  test('before the first entry there is no weight yet', () => {
    expect(weightOn(ENTRIES, '2026-09-19')).toBeNull()
    expect(weightOn([], '2026-10-01')).toBeNull()
  })
})

describe('changing entries (for showing a change before the server has it)', () => {
  test('saving a day adds it in date order, or replaces that day', () => {
    expect(
      withWeightSaved(ENTRIES, { date: '2026-09-25', weightKg: 72.8 }).map((e) => e.date),
    ).toEqual(['2026-09-20', '2026-09-25', '2026-10-01', '2026-10-05'])
    expect(withWeightSaved(ENTRIES, { date: '2026-10-01', weightKg: 72 })[1]).toEqual({
      date: '2026-10-01',
      weightKg: 72,
    })
    expect(ENTRIES[1]?.weightKg).toBe(72.4)
  })

  test('removing a day', () => {
    expect(withWeightRemoved(ENTRIES, '2026-10-01').map((e) => e.date)).toEqual([
      '2026-09-20',
      '2026-10-05',
    ])
  })
})

describe('parseWeight', () => {
  test('kg with one decimal, "," or "."', () => {
    expect(parseWeight('72,45')).toEqual({ ok: true, weightKg: 72.5 })
    expect(parseWeight(' 68 ')).toEqual({ ok: true, weightKg: 68 })
  })

  test('explains what is wrong', () => {
    expect(parseWeight('')).toEqual({ ok: false, message: 'Enter your weight' })
    expect(parseWeight('abc')).toEqual({ ok: false, message: 'Enter a number' })
    expect(parseWeight('12')).toEqual({ ok: false, message: 'Between 20 and 400 kg' })
    expect(parseWeight('401')).toEqual({ ok: false, message: 'Between 20 and 400 kg' })
  })
})

describe('formatKg', () => {
  test('one decimal in the given locale', () => {
    expect(formatKg(72.4, 'en')).toBe('72.4 kg')
    expect(formatKg(72, 'de')).toBe('72,0 kg')
  })
})
