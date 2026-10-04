import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'
import {
  createHousehold,
  fetchHousehold,
  fetchMembers,
  fetchProfile,
  joinHousehold,
  updateProfile,
  type Household,
  type Profile,
  type ProfilePatch,
} from './householdApi'
import { householdKeys, PROFILE_QUERY_PREFIX } from './queryKeys'

export function useProfile(userId: string): UseQueryResult<Profile> {
  return useQuery({ queryKey: householdKeys.profile(userId), queryFn: () => fetchProfile(userId) })
}

export function useHousehold(householdId: string): UseQueryResult<Household> {
  return useQuery({
    queryKey: householdKeys.household(householdId),
    queryFn: () => fetchHousehold(householdId),
  })
}

export function useMembers(householdId: string): UseQueryResult<Profile[]> {
  return useQuery({
    queryKey: householdKeys.members(householdId),
    queryFn: () => fetchMembers(householdId),
  })
}

function useHouseholdMutation(
  mutationFn: (input: string) => Promise<Household>,
): UseMutationResult<Household, Error, string> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: string) => mutationFn(input),
    // the profile now carries a household_id, which moves the app past onboarding
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_PREFIX }),
  })
}

export function useCreateHousehold(): UseMutationResult<Household, Error, string> {
  return useHouseholdMutation(createHousehold)
}

export function useJoinHousehold(): UseMutationResult<Household, Error, string> {
  return useHouseholdMutation(joinHousehold)
}

/** You first, then the other household members. */
export function usePeople(me: Profile, householdId: string): readonly Profile[] {
  const members = useMembers(householdId)
  return [me, ...(members.data ?? []).filter((member) => member.id !== me.id)]
}

export function displayName(member: Profile): string {
  return member.display_name || 'Unnamed'
}

type ProfileSnapshot = { readonly previous: Profile | undefined }

export function useUpdateProfile(
  userId: string,
): UseMutationResult<void, Error, ProfilePatch, ProfileSnapshot> {
  const queryClient = useQueryClient()
  const profileKey = householdKeys.profile(userId)
  const mutationKey = ['updateProfile', userId]
  return useMutation({
    mutationKey,
    mutationFn: (patch: ProfilePatch) => updateProfile(userId, patch),
    // shown right away (the whole app recolors on an appearance change), undone if saving fails
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: profileKey })
      const previous = queryClient.getQueryData<Profile>(profileKey)
      if (previous) queryClient.setQueryData<Profile>(profileKey, { ...previous, ...patch })
      return { previous }
    },
    onError: (_error, _patch, snapshot) => {
      if (snapshot?.previous) queryClient.setQueryData(profileKey, snapshot.previous)
    },
    // the name and accent show in the person switch and member list too. Refetch only after
    // the last of several quick changes, or an older answer would briefly undo the newer ones.
    // Not awaited: a change still waiting for its refetch must not count as in progress, or a
    // later change settling meanwhile would skip its own refetch
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey }) !== 1) return
      void queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_PREFIX })
      void queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })
}
