import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { monthKeys } from '../history/hooks'
import type { NutritionDay } from './trends'
import { loggedWeeks, type LoggedWeek } from './trendWeeks'
import { fetchNutritionDays } from './trendsApi'

/** Under the person's month queries, so every meal change refreshes the trends as well. */
function trendKey(userId: string, first: string, last: string) {
  return [...monthKeys.person(userId), 'trend', first, last] as const
}

/** Far enough back for every logged day (the oldest imported ones are from before 2026). */
const ALL_TIME_START = '2000-01-01'

/** Every calendar week with an entry, newest first (and the current one), for the Week view. */
export function useLoggedWeeks(userId: string, today: string): UseQueryResult<LoggedWeek[]> {
  return useQuery({
    queryKey: [...monthKeys.person(userId), 'weeks', today],
    queryFn: async () =>
      loggedWeeks(await fetchNutritionDays(userId, ALL_TIME_START, today), today),
  })
}

export function useNutritionDays(
  userId: string,
  first: string,
  last: string,
): UseQueryResult<NutritionDay[]> {
  return useQuery({
    queryKey: trendKey(userId, first, last),
    queryFn: () => fetchNutritionDays(userId, first, last),
  })
}
