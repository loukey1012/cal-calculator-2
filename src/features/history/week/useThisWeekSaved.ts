import { useGoals } from '../../goals/hooks'
import { formatKcal } from '../../nutrition/format'
import { useWeekQuery } from './hooks'
import { isoWeekOf, weekDatesOf } from './weekPages'
import { savedKcal } from './weekStats'

/**
 * What the running week has saved so far, worded for the calendar's menu ("750 kcal saved so
 * far", or "1,200 kcal surplus so far"); undefined while unknown, or when no burned figure applies.
 */
export function useThisWeekSaved(userId: string, today: string): string | undefined {
  const dates = weekDatesOf(isoWeekOf(today))
  const week = useWeekQuery(userId, dates[0] ?? today, dates.at(-1) ?? today)
  const goals = useGoals(userId)
  if (!week.data || !goals.data) return undefined
  const saved = savedKcal(week.data.days, goals.data, today)
  if (!saved) return undefined
  return saved.saved >= 0
    ? `${formatKcal(saved.saved)} kcal saved so far`
    : `${formatKcal(-saved.saved)} kcal surplus so far`
}
