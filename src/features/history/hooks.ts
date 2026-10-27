import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { DayTotal } from './calendar'
import { monthRange, weekEdgeRanges } from './calendar'
import { fetchDailyTotals, fetchNoteDates } from './historyApi'

/** Prefix of month queries; meal changes refresh every month of their person. */
export const monthKeys = {
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

/**
 * The days of the month with a note. Under the person's month prefix, so a changed meal or note
 * refreshes it with the totals (see keysForHint, useDayChange).
 */
export function useMonthNoteDates(userId: string, month: string): UseQueryResult<string[]> {
  const { first, last } = monthRange(month)
  return useQuery({
    queryKey: [...monthKeys.month(userId, month), 'notes'],
    queryFn: () => fetchNoteDates(userId, first, last),
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
