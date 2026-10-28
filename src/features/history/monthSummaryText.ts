import { roundTo } from '../../lib/numbers'
import { formatGrams, formatKcalTotal } from '../nutrition/format'
import { formatSigned } from '../trends/trendFormat'
import type { MonthSummary } from './calendar'
import type { MonthGoalStats } from './monthStats'

const dayCount = (count: number) => (count === 1 ? '1 day' : `${count} days`)

function averagesText({
  loggedDays,
  averageKcal,
  averageProtein,
  estimated,
}: MonthSummary): string {
  const kcal = `${dayCount(loggedDays)} logged · Ø ${formatKcalTotal({ kcal: averageKcal, estimated })} kcal`
  // no protein data at all would read as a misleading "0.0 g"
  return averageProtein > 0 ? `${kcal} · Ø ${formatGrams(averageProtein)} g protein` : kcal
}

export function summaryText(summary: MonthSummary): string {
  const { loggedDays, leftOutDays } = summary
  if (loggedDays === 0 && leftOutDays === 0) return 'Nothing logged this month.'
  // cheat days, alcohol days and days with a cheat meal aren't in the averages
  const parts = [
    loggedDays > 0 ? averagesText(summary) : null,
    leftOutDays > 0 ? `${dayCount(leftOutDays)} left out` : null,
  ]
  return parts.filter((part) => part !== null).join(' · ')
}

export function highlightsText(
  { withinGoal, judgedDays, longestStreak }: MonthGoalStats,
  weightChange: number | null,
): string {
  const parts = [
    judgedDays > 0 ? `${withinGoal} of ${dayCount(judgedDays)} within goal` : null,
    longestStreak > 0 ? `Longest streak ${dayCount(longestStreak)}` : null,
    weightChange !== null ? `Weight ${formatSigned('weight', roundTo(weightChange, 1))}` : null,
  ]
  return parts.filter((part) => part !== null).join(' · ')
}
