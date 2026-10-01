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
  type Household,
  type Profile,
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
