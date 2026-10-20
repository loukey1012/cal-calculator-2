import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'
import { deviceState, refreshSubscription, sendTest, turnOff, turnOn } from './pushDevice'
import type { DeviceState, TestResult } from './pushDevice'

export const notificationKeys = {
  device: ['pushDevice'] as const,
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
