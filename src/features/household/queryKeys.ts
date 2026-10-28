export const PROFILE_QUERY_PREFIX = ['profile'] as const

// Bump when the cached profile changes shape (v2: kcal_burned), so an old copy on the phone is
// ignored. The prefixes stay the same, so invalidating by prefix still reaches every version.
const PROFILE_SHAPE = 'v2'

export const householdKeys = {
  profile: (userId: string) => [...PROFILE_QUERY_PREFIX, PROFILE_SHAPE, userId] as const,
  household: (householdId: string) => ['household', householdId] as const,
  members: (householdId: string) => ['members', PROFILE_SHAPE, householdId] as const,
}

/** Where the version before v2 kept them on the phone (read once, so the app still opens offline). */
export const legacyHouseholdKeys = {
  profile: (userId: string) => [...PROFILE_QUERY_PREFIX, userId] as const,
  members: (householdId: string) => ['members', householdId] as const,
}
