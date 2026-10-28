import type { Goal } from '../../nutrition/goals'
import type { WeekData } from './weekApi'
import {
  countedOf,
  countingSummary,
  dailyBudget,
  extremes,
  mealAverages,
  savedKcal,
  topFoods,
  weekAverages,
  withinGoal,
  type WeekDay,
} from './weekStats'

const TOP_FOODS = 5

/** Everything the week page shows, worked out from the week's data (see weekStats). */
export function weekFigures(
  data: WeekData,
  goals: readonly Goal[],
  kcalBurned: number | null,
  today: string,
  dates: readonly string[],
) {
  const counted = countedOf(data.days, today)
  const byDate: ReadonlyMap<string, WeekDay> = new Map(data.days.map((day) => [day.date, day]))
  return {
    byDate,
    counted,
    isRunning: dates.includes(today),
    hasFood: data.days.some((day) => day.mealCount > 0),
    saved: savedKcal(data.days, kcalBurned, today),
    budget: dailyBudget(data.days, goals, today, dates),
    averages: weekAverages(counted, goals),
    within: withinGoal(counted, goals),
    extremes: extremes(counted),
    meals: mealAverages(data.meals, counted),
    foods: topFoods(data.foods, counted, TOP_FOODS),
    counting: countingSummary(dates, byDate, today),
  }
}
