import { ApiError } from '../../lib/errors'
import { supabase } from '../../lib/supabase'
import { goalFromRow, type Goal } from '../nutrition/goals'
import type { GoalInput } from './goalForm'

/** All goals a user ever set, newest first; `goalForDate` picks the one valid on a day. */
export async function fetchGoals(userId: string): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goal_history')
    .select('*')
    .eq('user_id', userId)
    .order('valid_from', { ascending: false })
  if (error) throw ApiError.from(error)
  return data.map(goalFromRow)
}

/** A goal from `validFrom` on; past days keep the goal they had. Saving twice a day replaces it. */
export async function saveGoal(userId: string, validFrom: string, goal: GoalInput): Promise<void> {
  const { error } = await supabase.from('goal_history').upsert(
    {
      user_id: userId,
      valid_from: validFrom,
      kcal: goal.kcal,
      protein_g: goal.proteinG,
      carbs_g: goal.carbsG,
      fat_g: goal.fatG,
      fiber_g: goal.fiberG,
      weight_goal_kg: goal.weightGoalKg,
    },
    { onConflict: 'user_id,valid_from' },
  )
  if (error) throw ApiError.from(error)
}
