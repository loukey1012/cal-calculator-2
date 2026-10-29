import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { addDays } from '../calendar'
import { fetchDailyTotals } from '../historyApi'
import type { DayTotal } from '../calendar'
import { monthKeys } from '../hooks'
import { TRACKING_START } from '../../../../supabase/functions/_shared/dayCounting'
import { fetchWeekData, type WeekData } from './weekApi'

/** Bump when the shape of the cached week data changes: phones keep old copies of the queries. */
const WEEK_SHAPE = 1
/** The same for the totals since tracking started. */
const SINCE_SHAPE = 2
const DAYS_PER_WEEK = 7

function weekKey(userId: string, first: string) {
  return [...monthKeys.person(userId), 'week', WEEK_SHAPE, first] as const
}

/** Just the asked week's query (never another week's data). */
function useWeekQuery(userId: string, first: string, last: string): UseQueryResult<WeekData> {
  return useQuery({
    queryKey: weekKey(userId, first),
    queryFn: () => fetchWeekData(userId, first, last),
  })
}

/** What the week page has of a week: its data, and which week that data is of. */
type WeekDataResult = {
  readonly data: WeekData | undefined
  readonly isError: boolean
  readonly error: Error | null
  /** the week the data is of: the asked one, or (while it loads) the one beside it */
  readonly shown: { readonly first: string; readonly last: string }
  /** the data is of the neighbouring week, kept on screen until the asked one is there */
  readonly isPlaceholder: boolean
}

/**
 * One week's days, meals, foods and notes. Under the person's month prefix, so a changed meal,
 * note or day mark refreshes it with the months (see keysForHint, useDayChange). Stepping to the
 * next or previous week shows the week just left (when it is cached) until the new one arrives:
 * each week is its own page, so this reads the cache instead of the observer's previous data.
 */
export function useWeekData(userId: string, first: string, last: string): WeekDataResult {
  const client = useQueryClient()
  const query = useWeekQuery(userId, first, last)
  const own = { first, last }
  if (query.data !== undefined || query.isError) {
    return {
      data: query.data,
      isError: query.isError,
      error: query.error,
      shown: own,
      isPlaceholder: false,
    }
  }
  for (const step of [-DAYS_PER_WEEK, DAYS_PER_WEEK]) {
    const neighbour = { first: addDays(first, step), last: addDays(last, step) }
    const data = client.getQueryData<WeekData>(weekKey(userId, neighbour.first))
    if (data !== undefined) {
      return { data, isError: false, error: null, shown: neighbour, isPlaceholder: true }
    }
  }
  return { data: undefined, isError: false, error: null, shown: own, isPlaceholder: false }
}

/**
 * The totals of every day from the day tracking started up to yesterday (today is never over),
 * for the running total of saved calories. Under the month prefix as well. The key has no date:
 * a new key per day would leave a persisted copy for each; instead a new day refetches it.
 */
export function useTotalsSinceStart(userId: string, today: string): UseQueryResult<DayTotal[]> {
  const client = useQueryClient()
  const last = addDays(today, -1)
  const queryKey = [...monthKeys.person(userId), 'since-start', SINCE_SHAPE]
  const lastSeen = useRef(last)
  useEffect(() => {
    if (lastSeen.current === last) return
    lastSeen.current = last
    void client.invalidateQueries({ queryKey })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the key is built from userId and last
  }, [client, last])
  return useQuery({
    queryKey,
    queryFn: () => (last < TRACKING_START ? [] : fetchDailyTotals(userId, TRACKING_START, last)),
  })
}
