import { formatKcal } from '../../nutrition/format'
import { useWeekQuery } from './hooks'
import { isoWeekOf, weekDatesOf } from './weekPages'
import { savedKcal } from './weekStats'

/**
 * What the running week has saved so far, worded for the calendar's menu ("750 kcal saved so
 * far", or "1,200 kcal surplus so far"); undefined while unknown, or when the person has no calories burned set.
 */
export function useThisWeekSaved(
  userId: string,
  kcalBurned: number | null,
  today: string,
): string | undefined {
  const dates = weekDatesOf(isoWeekOf(today))
  const week = useWeekQuery(userId, dates[0] ?? today, dates.at(-1) ?? today)
  if (!week.data) return undefined
  const saved = savedKcal(week.data.days, kcalBurned, today)
  if (!saved) return undefined
  return saved.saved >= 0
    ? `${formatKcal(saved.saved)} kcal saved so far`
    : `${formatKcal(-saved.saved)} kcal surplus so far`
}
