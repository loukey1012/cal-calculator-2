import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { monthKeys } from '../history/hooks'
import type { NutritionDay } from './trends'
import { fetchNutritionDays } from './trendsApi'

/** Under the person's month queries, so every meal change refreshes the trends as well. */
export function trendKey(userId: string, first: string, last: string) {
  return [...monthKeys.person(userId), 'trend', first, last] as const
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
