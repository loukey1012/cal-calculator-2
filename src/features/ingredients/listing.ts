import { formatKcal } from '../nutrition/format'
import { measureOf } from '../nutrition/unitNames'
import type { Category, CategoryGroup, Ingredient } from './ingredientsApi'

/** Which ingredients the category chips let through. */
export type CategoryFilter =
  | { readonly kind: 'all' }
  | { readonly kind: 'category'; readonly id: string }
  | { readonly kind: 'group'; readonly id: string }

export const ALL_CATEGORIES: CategoryFilter = { kind: 'all' }

export type IngredientFilter = {
  readonly query: string
  readonly category: CategoryFilter
  /** one brand only (case and accents don't matter), or null for every brand */
  readonly brand: string | null
}

/** A broad category with its categories, as the chips show it. */
export type ChipGroup = {
  readonly id: string
  readonly name: string
  readonly categories: readonly Category[]
}

type IngredientSection = {
  readonly id: string
  readonly title: string
  readonly ingredients: readonly Ingredient[]
}

// an ingredient whose category isn't in the (cached) list yet
const UNCATEGORIZED = { id: 'uncategorized', title: 'Other' } as const
const DEFAULT_UNIT_LABEL = 'unit'

/** Lowercase without accents, so "kase" finds "Käse". */
export function searchable(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

const byName = (a: Ingredient, b: Ingredient) => a.name.localeCompare(b.name)

/** The broad category of each known category. */
function groupIdsByCategory(categories: readonly Category[]): ReadonlyMap<string, string> {
  return new Map(categories.map((category) => [category.id, category.group_id]))
}

function matchesCategory(
  ingredient: Ingredient,
  filter: CategoryFilter,
  groupIds: ReadonlyMap<string, string>,
): boolean {
  if (filter.kind === 'all') return true
  if (filter.kind === 'category') return ingredient.category_id === filter.id
  return groupIds.get(ingredient.category_id) === filter.id
}

function matchesBrand(ingredient: Ingredient, brand: string | null): boolean {
  return brand === null || searchable(ingredient.brand ?? '') === searchable(brand)
}

/** `categories` tell which broad category each category is in; only broad filters need them. */
export function filterIngredients(
  ingredients: readonly Ingredient[],
  { query, category, brand }: IngredientFilter,
  categories: readonly Category[] = [],
): readonly Ingredient[] {
  const needle = searchable(query)
  const groupIds = groupIdsByCategory(categories)
  return ingredients.filter(
    (ingredient) =>
      matchesCategory(ingredient, category, groupIds) &&
      matchesBrand(ingredient, brand) &&
      (needle === '' ||
        searchable(`${ingredient.name} ${ingredient.brand ?? ''}`).includes(needle)),
  )
}

/** Broad categories by name, each with its categories by name; empty ones are hidden. */
export function chipGroups(
  groups: readonly CategoryGroup[],
  categories: readonly Category[],
): readonly ChipGroup[] {
  const sortedCategories = [...categories].sort((a, b) => a.name.localeCompare(b.name))
  return [...groups]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((group) => ({
      id: group.id,
      name: group.name,
      categories: sortedCategories.filter((category) => category.group_id === group.id),
    }))
    .filter((group) => group.categories.length > 0)
}

/** The broad category the filter is in: the picked one, or the one holding the picked category. */
export function groupOfFilter(
  groups: readonly ChipGroup[],
  filter: CategoryFilter,
): ChipGroup | undefined {
  if (filter.kind === 'group') return groups.find((group) => group.id === filter.id)
  if (filter.kind === 'category')
    return groups.find((group) => group.categories.some((category) => category.id === filter.id))
  return undefined
}

/** Sections sorted by category name; ingredients of a category not known yet come last. */
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
    ingredients: ingredients.filter((item) => !knownIds.has(item.category_id)).sort(byName),
  }
  return [...named, uncategorized].filter((section) => section.ingredients.length > 0)
}

/** e.g. "92 kcal / 100 g · 210 kcal / bar" (or "/ 100 ml"); "~" before guessed values */
export function nutritionSummary(ingredient: Ingredient, locale?: string): string {
  const kcal = (value: number) =>
    `${ingredient.kcal_estimated ? '~' : ''}${formatKcal(value, locale)} kcal`
  const parts = [
    ingredient.kcal_100 === null
      ? null
      : `${kcal(ingredient.kcal_100)} / 100 ${measureOf(ingredient)}`,
    ingredient.kcal_unit === null
      ? null
      : `${kcal(ingredient.kcal_unit)} / ${ingredient.unit_label ?? DEFAULT_UNIT_LABEL}`,
  ]
  return parts.filter((part) => part !== null).join(' · ')
}
