export const PROFILE_QUERY_PREFIX = ['profile'] as const

export const householdKeys = {
  profile: (userId: string) => [...PROFILE_QUERY_PREFIX, userId] as const,
  household: (householdId: string) => ['household', householdId] as const,
  members: (householdId: string) => ['members', householdId] as const,
}
