import type { NutritionValues } from './types'

/** Builds per-basis values for tests: unspecified nutrients are unknown (null). */
export function values(
  kcal: number,
  known: Partial<Omit<NutritionValues, 'kcal'>> = {},
): NutritionValues {
  return {
    kcal,
    protein: null,
    carbs: null,
    sugar: null,
    fat: null,
    sat_fat: null,
    fiber: null,
    salt: null,
    ...known,
  }
}
