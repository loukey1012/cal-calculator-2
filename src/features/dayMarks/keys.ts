/** Prefix of the household's day marks (sex days); a live hint refreshes all of them. */
export const householdMarkKeys = {
  all: (householdId: string) => ['householdMarks', householdId] as const,
  day: (householdId: string, date: string) => ['householdMarks', householdId, 'day', date] as const,
  month: (householdId: string, month: string) =>
    ['householdMarks', householdId, 'month', month] as const,
  year: (householdId: string, year: number) =>
    ['householdMarks', householdId, 'year', year] as const,
}
