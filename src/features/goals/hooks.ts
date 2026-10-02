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

export function useGoals(userId: string): UseQueryResult<Goal[]> {
  return useQuery({ queryKey: goalKeys.goals(userId), queryFn: () => fetchGoals(userId) })
}

export type SaveGoalInput = { readonly validFrom: string; readonly goal: GoalInput }

export function useSaveGoal(userId: string): UseMutationResult<void, Error, SaveGoalInput> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ validFrom, goal }: SaveGoalInput) => saveGoal(userId, validFrom, goal),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: goalKeys.goals(userId) }),
  })
}
