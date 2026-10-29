export const reviewKeys = {
  findings: (householdId: string) => ['ingredientFindings', householdId] as const,
}
