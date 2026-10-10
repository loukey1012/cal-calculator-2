import { formatKcal } from '../nutrition/format'
import type { Category, CategoryGroup, Ingredient } from './ingredientsApi'

/** Which ingredients the category chips let through. A broad category id of null is "Other". */
export type CategoryFilter =
  | { readonly kind: 'all' }
  | { readonly kind: 'category'; readonly id: string }
  | { readonly kind: 'group'; readonly id: string | null }

export const ALL_CATEGORIES: CategoryFilter = { kind: 'all' }

export type IngredientFilter = { readonly query: string; readonly category: CategoryFilter }

/** A broad category with its categories, as the grouped chips show it. */
export type ChipGroup = {
  /** null = "Other": ungrouped categories and ingredients without a category */
  readonly id: string | null
  readonly name: string
  readonly categories: readonly Category[]
}

export type IngredientSection = {
  readonly id: string
  readonly title: string
  readonly ingredients: readonly Ingredient[]
}

const UNCATEGORIZED = { id: 'uncategorized', title: 'Other' } as const
const OTHER_GROUP_NAME = 'Other'
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

/** The broad category of each known category (null when ungrouped). */
function groupIdsByCategory(categories: readonly Category[]): ReadonlyMap<string, string | null> {
  return new Map(categories.map((category) => [category.id, category.group_id]))
}

function matchesCategory(
  ingredient: Ingredient,
  filter: CategoryFilter,
  groupIds: ReadonlyMap<string, string | null>,
): boolean {
  if (filter.kind === 'all') return true
  if (filter.kind === 'category') return ingredient.category_id === filter.id
  const groupId = ingredient.category_id === null ? null : groupIds.get(ingredient.category_id)
  return (groupId ?? null) === filter.id
}

/** `categories` tell which broad category each category is in; only broad filters need them. */
export function filterIngredients(
  ingredients: readonly Ingredient[],
  { query, category }: IngredientFilter,
  categories: readonly Category[] = [],
): readonly Ingredient[] {
  const needle = searchable(query)
  const groupIds = groupIdsByCategory(categories)
  return ingredients.filter(
    (ingredient) =>
      matchesCategory(ingredient, category, groupIds) &&
      (needle === '' ||
        searchable(`${ingredient.name} ${ingredient.brand ?? ''}`).includes(needle)),
  )
}

/**
 * Broad categories by name, each with its categories by name. Broad categories without any are
 * hidden; "Other" comes last and only when something ends up in it.
 */
export function chipGroups(
  groups: readonly CategoryGroup[],
  categories: readonly Category[],
  ingredients: readonly Ingredient[],
): readonly ChipGroup[] {
  const sortedCategories = [...categories].sort((a, b) => a.name.localeCompare(b.name))
  const knownGroupIds = new Set(groups.map((group) => group.id))
  const named = [...groups]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((group) => ({
      id: group.id,
      name: group.name,
      categories: sortedCategories.filter((category) => category.group_id === group.id),
    }))
    .filter((group) => group.categories.length > 0)
  const ungrouped = sortedCategories.filter(
    (category) => category.group_id === null || !knownGroupIds.has(category.group_id),
  )
  const hasUncategorized = ingredients.some((ingredient) => ingredient.category_id === null)
  const other = { id: null, name: OTHER_GROUP_NAME, categories: ungrouped }
  return ungrouped.length > 0 || hasUncategorized ? [...named, other] : named
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

/** e.g. "92 kcal / 100 g · 210 kcal / bar"; "~" before guessed values */
export function nutritionSummary(ingredient: Ingredient, locale?: string): string {
  const kcal = (value: number) =>
    `${ingredient.kcal_estimated ? '~' : ''}${formatKcal(value, locale)} kcal`
  const parts = [
    ingredient.kcal_100 === null ? null : `${kcal(ingredient.kcal_100)} / 100 g`,
    ingredient.kcal_unit === null
      ? null
      : `${kcal(ingredient.kcal_unit)} / ${ingredient.unit_label ?? DEFAULT_UNIT_LABEL}`,
  ]
  return parts.filter((part) => part !== null).join(' · ')
}
