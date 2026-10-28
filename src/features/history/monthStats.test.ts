import { describe, expect, test } from 'vitest'
import type { DayTotal } from './calendar'
import { filterMatches, monthFilterOf, noteDatesOf, type MonthNote } from './monthStats'

function day(date: string, kcal: number, extra: Partial<DayTotal> = {}): DayTotal {
  return {
    date,
    kcal,
    protein: 0,
    mealCount: 3,
    kcalEstimated: false,
    lunchLogged: true,
    dinnerLogged: true,
    ...extra,
  }
}

describe('notes and filters', () => {
  const notes: MonthNote[] = [
    { date: '2026-10-03', mealType: null, text: 'Birthday' },
    { date: '2026-10-03', mealType: 'dinner', text: 'Pizza' },
    { date: '2026-10-05', mealType: 'lunch', text: 'Out' },
  ]

  test('lists the days with a note once each', () => {
    expect(noteDatesOf(notes)).toEqual(new Set(['2026-10-03', '2026-10-05']))
  })

  test('matches days by their status or note', () => {
    expect(filterMatches('notes', 'logged', true)).toBe(true)
    expect(filterMatches('notes', 'logged', false)).toBe(false)
    expect(
      filterMatches('alcohol', 'alcoholDay', false, day('2026-10-01', 0, { alcoholDay: true })),
    ).toBe(true)
    expect(
      filterMatches('alcohol', 'cheatDay', false, day('2026-10-01', 0, { cheatDay: true })),
    ).toBe(false)
    expect(filterMatches('alcohol', 'none', false)).toBe(false)
    expect(
      filterMatches('cheat', 'cheatDay', false, day('2026-10-01', 0, { cheatDay: true })),
    ).toBe(true)
    expect(
      filterMatches('cheat', 'cheatMeal', false, day('2026-10-01', 0, { cheatMeal: true })),
    ).toBe(true)
    // the status shows alcohol first, the flags still say there was a cheat meal
    expect(
      filterMatches(
        'cheat',
        'alcoholDay',
        false,
        day('2026-10-01', 0, { alcoholDay: true, cheatMeal: true }),
      ),
    ).toBe(true)
    expect(
      filterMatches('cheat', 'alcoholDay', false, day('2026-10-01', 0, { alcoholDay: true })),
    ).toBe(false)
    expect(filterMatches('missing', 'missing', false)).toBe(true)
    expect(filterMatches('missing', 'none', false)).toBe(false)
  })

  test('reads the filter from navigation state defensively', () => {
    expect(monthFilterOf({ filter: 'cheat' })).toBe('cheat')
    expect(monthFilterOf({ filter: 'bogus' })).toBeNull()
    expect(monthFilterOf({ filter: 3 })).toBeNull()
    expect(monthFilterOf({})).toBeNull()
    expect(monthFilterOf(null)).toBeNull()
    expect(monthFilterOf('x')).toBeNull()
  })
})
