import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { DayTotal } from './calendar'
import { monthRange } from './calendar'
import { fetchDailyTotals } from './historyApi'

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
