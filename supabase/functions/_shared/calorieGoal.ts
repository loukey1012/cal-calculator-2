/**
 * The one calorie rule behind rings, History's calendar, Trends and the weekly notification:
 * none while within the goal (up to 10 % over), the first color beyond that, the second once
 * more than 300 kcal over. Plain TypeScript without dependencies.
 */

/** Up to this share of the calorie goal still counts as within it. */
const WITHIN_GOAL_RATIO = 1.1
/** More calories over the goal than this is "well over" (the second color), whatever the goal. */
const RED_OVER_KCAL = 300
// sums like 3 × 0.1 × 100 give 30.000000000000004; strip that before rounding up
const FLOAT_NOISE_DECIMALS = 6

export type OverLevel = 'none' | 'full' | 'well'

/** Calories are always whole numbers, rounded up. */
export function toWholeKcal(value: number): number {
  const factor = 10 ** FLOAT_NOISE_DECIMALS
  return Math.ceil(Math.round((value + Math.sign(value) * Number.EPSILON) * factor) / factor)
}

export function calorieOverLevel(consumed: number, target: number): OverLevel {
  if (consumed - target > RED_OVER_KCAL) return 'well'
  return consumed > target * WITHIN_GOAL_RATIO ? 'full' : 'none'
}
