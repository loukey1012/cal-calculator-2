import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'
import { fetchPreferences, savePreferences, type Preferences } from './preferencesApi'
import { deviceState, refreshSubscription, sendTest, turnOff, turnOn } from './pushDevice'
import type { DeviceState, TestResult } from './pushDevice'

export const notificationKeys = {
  device: ['pushDevice'] as const,
  preferences: (userId: string) => ['notificationPreferences', userId] as const,
}

/** Whether this phone gets notifications; asked of the phone, never cached. */
export function useDeviceState(enabled: boolean): UseQueryResult<DeviceState> {
  return useQuery({
    queryKey: notificationKeys.device,
    queryFn: async () => {
      const state = await deviceState()
      // the phone may have been someone else's until now
      if (state === 'on') await refreshSubscription()
      return state
    },
    enabled,
    staleTime: 0,
    meta: { persist: false },
  })
}

export function useSwitchDevice(): UseMutationResult<void, Error, boolean> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (on: boolean) => (on ? turnOn() : turnOff()),
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.device }),
  })
}

export function useSendTest(): UseMutationResult<TestResult, Error, void> {
  return useMutation({ mutationFn: sendTest })
}

export function usePreferences(userId: string): UseQueryResult<Preferences> {
  return useQuery({
    queryKey: notificationKeys.preferences(userId),
    queryFn: () => fetchPreferences(userId),
  })
}

type PreferencesSnapshot = { readonly previous?: Preferences }

/** Shown at once, undone if saving fails; one save at a time, so the last choice wins. */
export function useSavePreferences(
  userId: string,
): UseMutationResult<void, Error, Preferences, PreferencesSnapshot> {
  const queryClient = useQueryClient()
  const key = notificationKeys.preferences(userId)
  return useMutation({
    scope: { id: `notificationPreferences:${userId}` },
    mutationFn: (preferences: Preferences) => savePreferences(userId, preferences),
    onMutate: async (preferences) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Preferences>(key)
      queryClient.setQueryData(key, preferences)
      return { previous }
    },
    onError: (_error, _preferences, snapshot) => {
      if (snapshot?.previous) queryClient.setQueryData(key, snapshot.previous)
    },
  })
}
