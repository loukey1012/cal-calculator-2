import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import { clearPersistedCache } from '../../lib/persistence'
import { signOut } from './authApi'

export function useSignOut(): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => signOut(),
    // drop everything cached for this account, in memory and on the phone
    onSuccess: async () => {
      queryClient.clear()
      await clearPersistedCache()
    },
  })
}
