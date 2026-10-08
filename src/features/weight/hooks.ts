import {
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query'
import { isQueuedChange } from '../../lib/persistence'
import { QUEUED_CHANGE_OPTIONS } from '../meals/dayChanges'
import type { WeightEntry } from './weight'
import { fetchWeights } from './weightApi'
import {
  applyWeightChange,
  applyWeightChangeLocally,
  weightChangeKey,
  weightKeys,
  WEIGHT_CHANGES_SCOPE,
  type WeightChange,
} from './weightChanges'

export function useWeights(userId: string): UseQueryResult<WeightEntry[]> {
  return useQuery({ queryKey: weightKeys.weights(userId), queryFn: () => fetchWeights(userId) })
}

type Rollback = { readonly previous: WeightEntry[] | undefined }

/**
 * Saves or removes a weight: shown at once, sent in the background (queued offline, kept on the
 * phone). A failed change restores the old list unless more changes are pending.
 */
export function useWeightChange(userId: string) {
  const queryClient = useQueryClient()
  const queryKey = weightKeys.weights(userId)
  const isOnlyPendingChange = () =>
    queryClient.isMutating({
      predicate: (mutation) => isQueuedChange(mutation.options.mutationKey),
    }) <= 1
  const mutation = useMutation<void, Error, WeightChange, Rollback>({
    mutationKey: weightChangeKey(userId),
    scope: WEIGHT_CHANGES_SCOPE,
    ...QUEUED_CHANGE_OPTIONS,
    mutationFn: applyWeightChange,
    onMutate: async (change) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<WeightEntry[]>(queryKey)
      queryClient.setQueryData(queryKey, applyWeightChangeLocally(previous ?? [], change))
      return { previous }
    },
    onError: (_error, _change, rollback) => {
      if (isOnlyPendingChange()) queryClient.setQueryData(queryKey, rollback?.previous)
    },
    onSettled: () =>
      isOnlyPendingChange() ? queryClient.invalidateQueries({ queryKey }) : undefined,
  })
  return {
    save: (entry: WeightEntry) => mutation.mutate({ kind: 'save', userId, entry }),
    remove: (date: string) => mutation.mutate({ kind: 'delete', userId, date }),
  }
}

/** The error of the latest weight change, or null once a later one succeeded. */
export function useLatestWeightChangeError(userId: string): Error | null {
  const changes = useMutationState({
    filters: { mutationKey: weightChangeKey(userId) },
    select: (mutation) => mutation.state,
  })
  const latest = changes.at(-1)
  return latest?.status === 'error' ? latest.error : null
}
