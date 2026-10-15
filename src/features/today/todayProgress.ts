import { useCurrentUser } from '../../app/currentUser'
import { useGoals } from '../goals/hooks'
import { useDay } from '../meals/hooks'
import { goalForDate, type Goal } from '../nutrition/goals'
import { mealTotals, type MealItemNutrition } from '../nutrition/totals'
import { useToday } from './useToday'

/** Calories eaten as a share of the goal (above 1 once over it); null without a goal. */
export function kcalProgress(
  items: readonly MealItemNutrition[],
  goal: Goal | null,
): number | null {
  if (!goal || goal.kcal <= 0) return null
  return mealTotals(items).kcal / goal.kcal
}

/** The signed-in user's calories today against today's goal, e.g. for the goal-aware background. */
export function useTodayProgress(): number | null {
  const { profile } = useCurrentUser()
  const today = useToday()
  const goals = useGoals(profile.id)
  const day = useDay(profile.id, today)
  const items = (day.data ?? []).flatMap((meal) => meal.meal_items)
  return kcalProgress(items, goalForDate(goals.data ?? [], today))
}
