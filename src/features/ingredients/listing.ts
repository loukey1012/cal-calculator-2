import { formatKcal } from '../nutrition/format'
import type { Category, Ingredient } from './ingredientsApi'

export type IngredientFilter = { readonly query: string; readonly categoryId: string | null }

export type IngredientSection = {
  readonly id: string
  readonly title: string
  readonly ingredients: readonly Ingredient[]
}

const UNCATEGORIZED = { id: 'uncategorized', title: 'Other' } as const
const DEFAULT_UNIT_LABEL = 'unit'

/** Lowercase without accents, so "kase" finds "Käse". */
function searchable(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

const byName = (a: Ingredient, b: Ingredient) => a.name.localeCompare(b.name)

export function filterIngredients(
  ingredients: readonly Ingredient[],
  { query, categoryId }: IngredientFilter,
): readonly Ingredient[] {
  const needle = searchable(query)
  return ingredients.filter(
    (ingredient) =>
      (categoryId === null || ingredient.category_id === categoryId) &&
      (needle === '' ||
        searchable(`${ingredient.name} ${ingredient.brand ?? ''}`).includes(needle)),
  )
}

/** Sections sorted by category name; ingredients without a (known) category come last. */
export function groupByCategory(
  ingredients: readonly Ingredient[],
  categories: readonly Category[],
): readonly IngredientSection[] {
  const named = [...categories]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((category) => ({
      id: category.id,
      title: category.name,
      ingredients: ingredients.filter((item) => item.category_id === category.id).sort(byName),
    }))
  const knownIds = new Set(categories.map((category) => category.id))
  const uncategorized = {
    ...UNCATEGORIZED,
    ingredients: ingredients
      .filter((item) => item.category_id === null || !knownIds.has(item.category_id))
      .sort(byName),
  }
  return [...named, uncategorized].filter((section) => section.ingredients.length > 0)
}

/** e.g. "92 kcal / 100 g · 210 kcal / bar" */
export function nutritionSummary(ingredient: Ingredient, locale?: string): string {
  const parts = [
    ingredient.kcal_100 === null ? null : `${formatKcal(ingredient.kcal_100, locale)} kcal / 100 g`,
    ingredient.kcal_unit === null
      ? null
      : `${formatKcal(ingredient.kcal_unit, locale)} kcal / ${ingredient.unit_label ?? DEFAULT_UNIT_LABEL}`,
  ]
  return parts.filter((part) => part !== null).join(' · ')
}
