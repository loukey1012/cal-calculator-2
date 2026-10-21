import { z } from 'zod'
import type { IngredientFormValues } from './ingredientForm'

/**
 * What was typed into an ingredient form and not saved yet, kept on this phone: a page closed by
 * accident (or iOS ending the app in the background) loses nothing. One per person and
 * ingredient ("new" for a new one); removed once saved or discarded.
 */

const VERSION = 2

const basis = z.record(z.string(), z.string())

const draftSchema = z.object({
  name: z.string(),
  brand: z.string(),
  categoryId: z.string(),
  newCategoryName: z.string(),
  groupId: z.string(),
  note: z.string(),
  barcode: z.string(),
  per100gEnabled: z.boolean(),
  per100g: basis,
  perUnitEnabled: z.boolean(),
  perUnit: basis,
  measure: z.enum(['g', 'ml']),
  unitLabel: z.string(),
  unitWeightG: z.string(),
  kcalEstimated: z.boolean(),
})

const keyFor = (draftKey: string) => `ingredient-draft:v${VERSION}:${draftKey}`

export function loadIngredientDraft(draftKey: string): IngredientFormValues | null {
  try {
    const stored = localStorage.getItem(keyFor(draftKey))
    if (stored === null) return null
    const parsed = draftSchema.safeParse(JSON.parse(stored))
    return parsed.success ? (parsed.data as IngredientFormValues) : null
  } catch {
    // unreadable or blocked storage: nothing to restore
    return null
  }
}

export function saveIngredientDraft(draftKey: string, values: IngredientFormValues): void {
  try {
    localStorage.setItem(keyFor(draftKey), JSON.stringify(values))
  } catch {
    // private browsing or full storage: the values only live while the form is open
  }
}

export function clearIngredientDraft(draftKey: string): void {
  try {
    localStorage.removeItem(keyFor(draftKey))
  } catch {
    // nothing stored then either
  }
}
