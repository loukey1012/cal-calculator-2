import { z } from 'zod'
import { MAX_DISH_ENTRIES } from '../dishes/dishDraft'
import type { AddFoodDraft } from './addFoodDraft'

/**
 * Add food's unsaved draft, kept on this phone so switching tabs or iOS closing the app
 * loses nothing. Anything stored that doesn't match the current shape is ignored.
 */

const VERSION = 1
const MAX_PORTIONS = 20
const MAX_NAME = 200

const mealType = z.enum(['breakfast', 'lunch', 'dinner', 'snack'])
const nutrient = z.number().nonnegative().nullable()
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const itemSchema = z.object({
  ingredient_id: z.string().nullable(),
  name: z.string().min(1),
  brand: z.string().nullable(),
  entered_amount: z.number().positive(),
  entered_unit: z.enum(['g', 'ml', 'unit']),
  basis: z.enum(['per_100g', 'per_unit']),
  basis_multiplier: z.number().positive(),
  kcal: z.number().nonnegative(),
  protein: nutrient,
  carbs: nutrient,
  sugar: nutrient,
  fat: nutrient,
  sat_fat: nutrient,
  fiber: nutrient,
  salt: nutrient,
})

const toWeighItemSchema = z.object({
  id: z.string().min(1),
  ingredientId: z.string().min(1),
  name: z.string().min(1).max(MAX_NAME),
})

/** Items that don't fit, or repeat an id, are dropped: a bad one must not lose the draft. */
const toWeighSchema = z
  .array(z.unknown())
  .optional()
  .transform((entries) => {
    if (!entries) return undefined
    const seen = new Set<string>()
    return entries
      .flatMap((entry) => {
        const parsed = toWeighItemSchema.safeParse(entry)
        return parsed.success ? [parsed.data] : []
      })
      .filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)))
      .slice(0, MAX_DISH_ENTRIES)
  })

const dishSchema = z.object({
  id: z.string().min(1),
  name: z.string().nullable(),
  splitMode: z.enum(['equal', 'count', 'percent', 'weight']),
  cookedWeightG: z.number().nullable(),
  kcalEstimated: z.boolean().optional(),
  revision: z.string(),
  portions: z
    .array(
      z.object({
        id: z.string().min(1),
        eater: z.object({ userId: z.string().min(1), date: z.string(), mealType }).nullable(),
        splitValue: z.number().nullable(),
        discarded: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(MAX_PORTIONS),
  lines: z
    .array(
      z.object({
        id: z.string().min(1),
        allocation: z.enum(['shared', 'per_portion']),
        item: itemSchema,
        amounts: z.record(z.string(), z.number().positive()),
      }),
    )
    .max(MAX_DISH_ENTRIES),
  toWeigh: toWeighSchema,
})

const storedSchema = z.object({
  version: z.literal(VERSION),
  draft: z.object({
    dish: dishSchema,
    date: day.nullable(),
    mealType: mealType.nullable(),
  }),
})

function keyFor(userId: string): string {
  return `cook-draft:v${VERSION}:${userId}`
}

export function loadAddFoodDraft(userId: string): AddFoodDraft | null {
  try {
    const stored = localStorage.getItem(keyFor(userId))
    if (stored === null) return null
    const parsed = storedSchema.safeParse(JSON.parse(stored))
    return parsed.success ? parsed.data.draft : null
  } catch {
    // unreadable or blocked storage: start a new draft
    return null
  }
}

export function saveAddFoodDraft(userId: string, draft: AddFoodDraft): void {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify({ version: VERSION, draft }))
  } catch {
    // private browsing or full storage: the draft only lives while the app is open
  }
}

export function clearAddFoodDraft(userId: string): void {
  try {
    localStorage.removeItem(keyFor(userId))
  } catch {
    // nothing stored then either
  }
}
