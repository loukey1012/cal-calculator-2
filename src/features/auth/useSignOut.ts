import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import { signOut } from './authApi'

export function useSignOut(): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => signOut(),
    // drop everything cached for this account
    onSuccess: () => queryClient.clear(),
  })
}
