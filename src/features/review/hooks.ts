import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'
import type { Ingredient } from '../ingredients/ingredientsApi'
import { useInvalidateIngredients } from '../ingredients/hooks'
import {
  decideFinding,
  fetchOpenFindings,
  patchIngredient,
  type Finding,
  type FindingDecision,
} from './reviewApi'
import type { IngredientPatch } from './suggestion'

export const reviewKeys = {
  findings: (householdId: string) => ['ingredientFindings', householdId] as const,
}

export function useOpenFindings(householdId: string): UseQueryResult<Finding[]> {
  return useQuery({
    queryKey: reviewKeys.findings(householdId),
    queryFn: () => fetchOpenFindings(householdId),
  })
}

type DecidedContext = { previous?: Finding[] }

/** Takes a decided finding off the list at once; it comes back if saving fails. */
function useDecidedLocally<TInput extends { readonly finding: Finding }>(householdId: string) {
  const queryClient = useQueryClient()
  const key = reviewKeys.findings(householdId)
  return {
    onMutate: async ({ finding }: TInput): Promise<DecidedContext> => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Finding[]>(key)
      queryClient.setQueryData<Finding[]>(key, (list) =>
        list?.filter(({ id }) => id !== finding.id),
      )
      return { previous }
    },
    onError: (_error: Error, _input: TInput, context?: DecidedContext) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  }
}

export type DecideInput = { readonly finding: Finding; readonly decision: FindingDecision }

export function useDecideFinding(
  householdId: string,
  userId: string,
): UseMutationResult<void, Error, DecideInput, DecidedContext> {
  return useMutation({
    mutationFn: ({ finding, decision }) => decideFinding(finding.id, decision, userId),
    ...useDecidedLocally<DecideInput>(householdId),
  })
}

export type ApplyInput = { readonly finding: Finding; readonly patch: IngredientPatch }

/**
 * Applies a finding's fix to its ingredient, then marks the finding applied. Resolves with the
 * changed ingredient (null when the fix changed nothing), so recent meals can follow it.
 */
export function useApplyFinding(
  householdId: string,
  userId: string,
): UseMutationResult<Ingredient | null, Error, ApplyInput, DecidedContext> {
  const invalidateIngredients = useInvalidateIngredients(householdId)
  const decided = useDecidedLocally<ApplyInput>(householdId)
  return useMutation({
    mutationFn: async ({ finding, patch }) => {
      const changed =
        finding.ingredient_id && Object.keys(patch).length > 0
          ? await patchIngredient(finding.ingredient_id, patch)
          : null
      await decideFinding(finding.id, 'applied', userId)
      return changed
    },
    onMutate: decided.onMutate,
    onError: decided.onError,
    onSettled: () => Promise.all([decided.onSettled(), invalidateIngredients()]),
  })
}
