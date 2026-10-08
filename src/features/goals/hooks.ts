import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'
import type { Goal } from '../nutrition/goals'
import type { GoalInput } from './goalForm'
import { fetchGoals, saveGoal } from './goalsApi'

export const goalKeys = { goals: (userId: string) => ['goals', userId] as const }

/** Goals cached by an older app version lack the newer targets: those are simply not set. */
export function withAllTargets(goal: Goal): Goal {
  return { ...goal, fiberG: goal.fiberG ?? null, weightGoalKg: goal.weightGoalKg ?? null }
}

const withAllTargetsEach = (goals: Goal[]) => goals.map(withAllTargets)

export function useGoals(userId: string): UseQueryResult<Goal[]> {
  return useQuery({
    queryKey: goalKeys.goals(userId),
    queryFn: () => fetchGoals(userId),
    select: withAllTargetsEach,
  })
}

export type SaveGoalInput = { readonly validFrom: string; readonly goal: GoalInput }

export function useSaveGoal(userId: string): UseMutationResult<void, Error, SaveGoalInput> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ validFrom, goal }: SaveGoalInput) => saveGoal(userId, validFrom, goal),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: goalKeys.goals(userId) }),
  })
}
