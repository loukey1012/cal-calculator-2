import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { DayTotal } from './calendar'
import { monthRange, weekEdgeRanges } from './calendar'
import { yearRange } from './yearOverview'
import type { MonthNote } from './monthStats'
import { fetchAllNotes, fetchDailyTotals, fetchMonthNotes } from './historyApi'

/** Prefix of month queries; meal changes refresh every month of their person. */
export const monthKeys = {
  /** every person's months */
  all: ['month'] as const,
  person: (userId: string) => ['month', userId] as const,
  month: (userId: string, month: string) => ['month', userId, month] as const,
}

export function useMonthTotals(userId: string, month: string): UseQueryResult<DayTotal[]> {
  const { first, last } = monthRange(month)
  return useQuery({
    queryKey: monthKeys.month(userId, month),
    queryFn: () => fetchDailyTotals(userId, first, last),
  })
}

/** Bump when the shape of the cached notes changes: phones keep old copies of the queries. */
const NOTES_SHAPE = 2

/**
 * The notes of the month. Under the person's month prefix, so a changed meal or note refreshes
 * it with the totals (see keysForHint, useDayChange).
 */
export function useMonthNotes(userId: string, month: string): UseQueryResult<MonthNote[]> {
  const { first, last } = monthRange(month)
  return useQuery({
    queryKey: [...monthKeys.month(userId, month), 'notes', NOTES_SHAPE],
    queryFn: () => fetchMonthNotes(userId, first, last),
  })
}

/** Bump when the shape of the cached notes of all months changes (see NOTES_SHAPE). */
const ALL_NOTES_SHAPE = 1

/**
 * Every note of the person, for the Notes view. Under the person's month prefix as well, so a
 * changed meal or note refreshes it with the months.
 */
export function useAllNotes(userId: string): UseQueryResult<MonthNote[]> {
  return useQuery({
    queryKey: [...monthKeys.person(userId), 'all-notes', ALL_NOTES_SHAPE],
    queryFn: () => fetchAllNotes(userId),
  })
}

/**
 * The totals of the days of the month's first and last week that lie in the neighbouring months,
 * only for the week averages (the month's own totals stay in `useMonthTotals`). Days after today
 * have no totals and are not asked for.
 */
export function useWeekEdgeTotals(
  userId: string,
  month: string,
  today: string,
): UseQueryResult<DayTotal[]> {
  const ranges = weekEdgeRanges(month)
    .filter((range) => range.first <= today)
    .map((range) => ({ first: range.first, last: range.last < today ? range.last : today }))
  return useQuery({
    queryKey: [...monthKeys.month(userId, month), 'edges', today],
    queryFn: async () =>
      (
        await Promise.all(ranges.map(({ first, last }) => fetchDailyTotals(userId, first, last)))
      ).flat(),
  })
}

/**
 * The totals of a whole year, for the year overview; only mounted while that is shown. Under
 * the person's month prefix, so a changed meal refreshes it with the months.
 */
export function useYearTotals(userId: string, year: number): UseQueryResult<DayTotal[]> {
  const { first, last } = yearRange(year)
  return useQuery({
    queryKey: [...monthKeys.person(userId), 'year', year],
    queryFn: () => fetchDailyTotals(userId, first, last),
  })
}
