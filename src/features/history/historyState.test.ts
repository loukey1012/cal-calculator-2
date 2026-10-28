import { describe, expect, test } from 'vitest'
import {
  calendarZoomOf,
  monthOf,
  notesQueryOf,
  scrollToDayOf,
  viewOf,
  yearOf,
} from './historyState'

describe('viewOf', () => {
  test('reads the notes and trends views from the state', () => {
    expect(viewOf({ view: 'notes' })).toBe('notes')
    expect(viewOf({ view: 'trends' })).toBe('trends')
  })

  test.each([undefined, null, 'notes', 5, {}, { view: 'week' }, { view: 3 }, { view: null }])(
    'reads %j as the calendar',
    (state) => {
      expect(viewOf(state)).toBe('calendar')
    },
  )
})

describe('monthOf', () => {
  test('reads the month from the state', () => {
    expect(monthOf({ month: '2026-09-01' })).toBe('2026-09-01')
  })

  test.each([
    undefined,
    null,
    'x',
    {},
    { month: 3 },
    { month: 'garbage' },
    { month: '2026-09-02' },
    { month: '2026-13-01' },
    { month: '2026-00-01' },
    { month: '2026-09-01x' },
  ])('reads %j as none', (state) => {
    expect(monthOf(state)).toBeNull()
  })
})

describe('scrollToDayOf', () => {
  test('is true only for an explicit true', () => {
    expect(scrollToDayOf({ scrollToDay: true })).toBe(true)
  })

  test.each([
    undefined,
    null,
    'x',
    {},
    { scrollToDay: false },
    { scrollToDay: 'true' },
    { scrollToDay: 1 },
  ])('reads %j as no', (state) => {
    expect(scrollToDayOf(state)).toBe(false)
  })
})

describe('notesQueryOf', () => {
  test('reads the search text from the state', () => {
    expect(notesQueryOf({ notesQuery: 'pizza' })).toBe('pizza')
  })

  test.each([undefined, null, 'x', {}, { notesQuery: 3 }, { notesQuery: null }])(
    'reads %j as an empty search',
    (state) => {
      expect(notesQueryOf(state)).toBe('')
    },
  )
})

describe('calendarZoomOf', () => {
  test('reads the year zoom from the state', () => {
    expect(calendarZoomOf({ calendarZoom: 'year' })).toBe('year')
  })

  test.each([undefined, null, 'year', 5, {}, { calendarZoom: 'week' }, { calendarZoom: 1 }])(
    'reads %j as the month',
    (state) => {
      expect(calendarZoomOf(state)).toBe('month')
    },
  )
})

describe('yearOf', () => {
  test('reads the shown year from the state', () => {
    expect(yearOf({ year: 2025 })).toBe(2025)
  })

  test.each([
    undefined,
    null,
    'x',
    {},
    { year: '2026' },
    { year: 2026.5 },
    { year: 20 },
    { year: 99999 },
    { year: Number.NaN },
    { year: null },
  ])('reads %j as none', (state) => {
    expect(yearOf(state)).toBeNull()
  })
})
