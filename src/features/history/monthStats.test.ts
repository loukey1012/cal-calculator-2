import { describe, expect, test } from 'vitest'
import type { DayTotal } from './calendar'
import {
  filterMatches,
  MONTH_FILTERS,
  monthFilterOf,
  noteDatesOf,
  type FilterInput,
  type MonthFilter,
  type MonthNote,
} from './monthStats'

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
    const base = { status: 'none', hasNote: false, hasGym: false, hasSex: false } as const
    const match = (filter: MonthFilter, extra: Partial<FilterInput>) =>
      filterMatches({ ...base, filter, ...extra })
    const flagged = (extra: Partial<DayTotal>) => day('2026-10-01', 0, extra)

    expect(match('notes', { status: 'logged', hasNote: true })).toBe(true)
    expect(match('notes', { status: 'logged' })).toBe(false)
    expect(match('alcohol', { status: 'alcoholDay', total: flagged({ alcoholDay: true }) })).toBe(
      true,
    )
    expect(match('alcohol', { status: 'cheatDay', total: flagged({ cheatDay: true }) })).toBe(false)
    expect(match('alcohol', {})).toBe(false)
    expect(match('cheat', { status: 'cheatDay', total: flagged({ cheatDay: true }) })).toBe(true)
    expect(match('cheat', { status: 'cheatMeal', total: flagged({ cheatMeal: true }) })).toBe(true)
    // the status shows alcohol first, the flags still say there was a cheat meal
    expect(
      match('cheat', {
        status: 'alcoholDay',
        total: flagged({ alcoholDay: true, cheatMeal: true }),
      }),
    ).toBe(true)
    expect(match('cheat', { status: 'alcoholDay', total: flagged({ alcoholDay: true }) })).toBe(
      false,
    )
    expect(match('missing', { status: 'missing' })).toBe(true)
    expect(match('missing', {})).toBe(false)
  })

  test('matches gym and sex days by their own marks, whatever the status', () => {
    const base = { status: 'logged', hasNote: false, hasGym: false, hasSex: false } as const

    expect(filterMatches({ ...base, filter: 'gym', hasGym: true })).toBe(true)
    expect(filterMatches({ ...base, filter: 'gym', hasSex: true })).toBe(false)
    expect(filterMatches({ ...base, filter: 'sex', hasSex: true })).toBe(true)
    expect(filterMatches({ ...base, filter: 'sex', hasGym: true })).toBe(false)
  })

  test('the filters offer Gym and Sex', () => {
    expect(MONTH_FILTERS.map(({ label }) => label)).toEqual(expect.arrayContaining(['Gym', 'Sex']))
  })

  test('reads the filter from navigation state defensively', () => {
    expect(monthFilterOf({ filter: 'cheat' })).toBe('cheat')
    expect(monthFilterOf({ filter: 'gym' })).toBe('gym')
    expect(monthFilterOf({ filter: 'bogus' })).toBeNull()
    expect(monthFilterOf({ filter: 3 })).toBeNull()
    expect(monthFilterOf({})).toBeNull()
    expect(monthFilterOf(null)).toBeNull()
    expect(monthFilterOf('x')).toBeNull()
  })
})
