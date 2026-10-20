import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import { clearPersistedCache } from '../../lib/persistence'
import { turnOff } from '../notifications/pushDevice'
import { signOut } from './authApi'

/** This phone stops getting the signed-out person's notifications. */
async function forgetThisPhone(): Promise<void> {
  try {
    await turnOff()
  } catch {
    // e.g. offline or no push on this phone: signing out still works, and whoever signs in
    // next with notifications on takes the phone over
  }
}

export function useSignOut(): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await forgetThisPhone()
      await signOut()
    },
    // drop everything cached for this account, in memory and on the phone
    onSuccess: async () => {
      queryClient.clear()
      await clearPersistedCache()
    },
  })
}
