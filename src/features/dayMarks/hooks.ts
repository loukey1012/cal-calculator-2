import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { monthRange, monthStart } from '../history/calendar'
import { monthKeys } from '../history/hooks'
import { yearRange } from '../history/yearOverview'
import { mirrorOf } from '../meals/cachedMirror'
import type { DayChange } from '../meals/dayChanges'
import { useCachedDayChange, type DayChangeActions } from '../meals/hooks'
import { fetchGymDates, fetchGymDay, fetchSexDates, fetchSexDay } from './dayMarksApi'
import { householdMarkKeys } from './keys'

// the gym day is the person's own, so it lives under their day and month keys: everything that
// refreshes the day or the months refreshes it too
const gymKeys = {
  day: (userId: string, date: string) => ['day', userId, date, 'gym'] as const,
  month: (userId: string, month: string) => [...monthKeys.month(userId, month), 'gym'] as const,
  year: (userId: string, year: number) => [...monthKeys.person(userId), 'gym-year', year] as const,
}

const yearOf = (date: string) => Number(date.slice(0, 4))

// keys that never fetch: used while the household is not known (the boolean day and the date
// lists are different shapes, so they must not share one cache entry)
const NO_HOUSEHOLD_DAY = ['householdMarks', 'none', 'day'] as const
const NO_HOUSEHOLD_DATES = ['householdMarks', 'none', 'dates'] as const

/** Whether the person marked the day as a gym day. */
export function useGymDay(userId: string, date: string): UseQueryResult<boolean> {
  return useQuery({
    queryKey: gymKeys.day(userId, date),
    queryFn: () => fetchGymDay(userId, date),
  })
}

/** Whether the household marked the day as a sex day (the same for both people). */
export function useSexDay(householdId: string | null, date: string): UseQueryResult<boolean> {
  return useQuery({
    queryKey: householdId ? householdMarkKeys.day(householdId, date) : NO_HOUSEHOLD_DAY,
    queryFn: () => fetchSexDay(householdId ?? '', date),
    enabled: householdId !== null,
  })
}

export function useMonthGymDates(userId: string, month: string): UseQueryResult<string[]> {
  const { first, last } = monthRange(month)
  return useQuery({
    queryKey: gymKeys.month(userId, month),
    queryFn: () => fetchGymDates(userId, first, last),
  })
}

export function useMonthSexDates(
  householdId: string | null,
  month: string,
): UseQueryResult<string[]> {
  const { first, last } = monthRange(month)
  return useQuery({
    queryKey: householdId ? householdMarkKeys.month(householdId, month) : NO_HOUSEHOLD_DATES,
    queryFn: () => fetchSexDates(householdId ?? '', first, last),
    enabled: householdId !== null,
  })
}

export function useYearGymDates(userId: string, year: number): UseQueryResult<string[]> {
  const { first, last } = yearRange(year)
  return useQuery({
    queryKey: gymKeys.year(userId, year),
    queryFn: () => fetchGymDates(userId, first, last),
  })
}

export function useYearSexDates(
  householdId: string | null,
  year: number,
): UseQueryResult<string[]> {
  const { first, last } = yearRange(year)
  return useQuery({
    queryKey: householdId ? householdMarkKeys.year(householdId, year) : NO_HOUSEHOLD_DATES,
    queryFn: () => fetchSexDates(householdId ?? '', first, last),
    enabled: householdId !== null,
  })
}

/** The dates with the change's date in or out; dates stay sorted and without repeats. */
function withChangedDate(dates: readonly string[], change: DayChange): string[] {
  if (change.kind !== 'gymDay' && change.kind !== 'sexDay') return [...dates]
  const others = dates.filter((existing) => existing !== change.date)
  return change.on ? [...others, change.date].sort() : others
}

/** Sets or takes back the person's gym day; queued like the other day changes. */
export function useSetGymDay(userId: string, date: string): DayChangeActions<boolean> {
  const change = useCachedDayChange<boolean>(
    userId,
    date,
    gymKeys.day(userId, date),
    (cached, next) => (next.kind === 'gymDay' ? next.on : (cached ?? false)),
    [],
    [
      mirrorOf<string[]>(gymKeys.month(userId, monthStart(date)), withChangedDate),
      mirrorOf<string[]>(gymKeys.year(userId, yearOf(date)), withChangedDate),
    ],
  )
  return { ...change, mutate: (on) => change.mutate({ kind: 'gymDay', userId, date, on }) }
}

/**
 * Sets or takes back the household's sex day; queued like the other day changes. Without a
 * household there is nothing to set, so there is no way to call it.
 */
export function useSetSexDay(
  householdId: string | null,
  date: string,
  userId: string,
): DayChangeActions<boolean> | null {
  const change = useCachedDayChange<boolean>(
    userId,
    date,
    householdId ? householdMarkKeys.day(householdId, date) : NO_HOUSEHOLD_DAY,
    (cached, next) => (next.kind === 'sexDay' ? next.on : (cached ?? false)),
    householdId ? [householdMarkKeys.all(householdId)] : [],
    householdId
      ? [
          mirrorOf<string[]>(
            householdMarkKeys.month(householdId, monthStart(date)),
            withChangedDate,
          ),
          mirrorOf<string[]>(householdMarkKeys.year(householdId, yearOf(date)), withChangedDate),
        ]
      : [],
  )
  if (!householdId) return null
  return {
    ...change,
    mutate: (on) => change.mutate({ kind: 'sexDay', householdId, userId, date, on }),
  }
}
