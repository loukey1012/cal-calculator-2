import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'
import type { Ingredient } from '../ingredients/ingredientsApi'
import { DISH_CHANGES_KEY, LEFTOVERS_KEY } from '../dishes/dishChanges'
import { monthKeys } from '../history/hooks'
import { ingredientKeys, useInvalidateIngredients } from '../ingredients/hooks'
import { clearIngredientDraft, ingredientDraftKey } from '../ingredients/ingredientDraft'
import { DAY_CHANGES_KEY } from '../meals/dayChanges'
import { reviewKeys } from './keys'
import {
  decideFinding,
  fetchOpenFindings,
  mergeIngredients,
  patchIngredient,
  type Finding,
  type FindingDecision,
  type MergeInput,
} from './reviewApi'
import type { IngredientPatch } from './suggestion'

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

type DecideInput = { readonly finding: Finding; readonly decision: FindingDecision }

export function useDecideFinding(
  householdId: string,
  userId: string,
): UseMutationResult<void, Error, DecideInput, DecidedContext> {
  return useMutation({
    mutationFn: ({ finding, decision }) => decideFinding(finding.id, decision, userId),
    ...useDecidedLocally<DecideInput>(householdId),
  })
}

type ApplyInput = { readonly finding: Finding; readonly patch: IngredientPatch }

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

/**
 * After a merge: the ingredient lists and findings, and everything that holds the dropped
 * ingredient's id (days, months, dishes, leftovers: its uses now point at the kept one).
 */
function useInvalidateAfterMerge(householdId: string): () => Promise<unknown> {
  const queryClient = useQueryClient()
  const invalidateIngredients = useInvalidateIngredients(householdId)
  const roots = [
    ingredientKeys.uses(householdId),
    reviewKeys.findings(householdId),
    DAY_CHANGES_KEY,
    monthKeys.all,
    DISH_CHANGES_KEY,
    LEFTOVERS_KEY,
  ]
  return () =>
    Promise.all([
      invalidateIngredients(),
      ...roots.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    ])
}

/** What was typed into either form before the merge would overwrite the merged values. */
function useClearMergedDrafts(householdId: string) {
  return ({ keepId, dropId }: { readonly keepId: string; readonly dropId: string }) => {
    clearIngredientDraft(ingredientDraftKey(householdId, keepId))
    clearIngredientDraft(ingredientDraftKey(householdId, dropId))
  }
}

type MergeFindingInput = Omit<MergeInput, 'findingId'> & { readonly finding: Finding }

/** Merges a duplicate into the one kept and marks its finding applied. */
export function useMergeIngredients(
  householdId: string,
): UseMutationResult<void, Error, MergeFindingInput, DecidedContext> {
  const invalidateAfterMerge = useInvalidateAfterMerge(householdId)
  const decided = useDecidedLocally<MergeFindingInput>(householdId)
  const clearDrafts = useClearMergedDrafts(householdId)
  return useMutation({
    mutationFn: ({ finding, ...merge }) => mergeIngredients({ ...merge, findingId: finding.id }),
    onSuccess: (_result, input) => clearDrafts(input),
    onMutate: decided.onMutate,
    onError: decided.onError,
    onSettled: () => Promise.all([decided.onSettled(), invalidateAfterMerge()]),
  })
}

type MergeByHandInput = Omit<MergeInput, 'findingId'>

/** Merges two ingredients the user picked themselves (no finding behind it). */
export function useMergeByHand(
  householdId: string,
): UseMutationResult<void, Error, MergeByHandInput> {
  const invalidateAfterMerge = useInvalidateAfterMerge(householdId)
  const clearDrafts = useClearMergedDrafts(householdId)
  return useMutation({
    mutationFn: (merge) => mergeIngredients({ ...merge, findingId: null }),
    onSuccess: (_result, input) => clearDrafts(input),
    // a finding about the dropped one went with it
    onSettled: invalidateAfterMerge,
  })
}
