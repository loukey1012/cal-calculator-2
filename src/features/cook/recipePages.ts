import { COOK_PATH } from './cookSteps'

/** The recipe pages on the Cook tab, pushed on top of the dish like the Cook steps. */
export type RecipePageRef =
  { readonly kind: 'list' } | { readonly kind: 'recipe'; readonly recipeId: string }

export const RECIPES_PATH = `${COOK_PATH}/recipes`

export function recipePath(recipeId: string): string {
  return `${RECIPES_PATH}/${encodeURIComponent(recipeId)}`
}

/** The recipe page an address under Cook shows, or null for the dish and its steps. */
export function recipePageOf(path: string): RecipePageRef | null {
  const trimmed = path.replace(/\/+$/, '')
  if (trimmed === RECIPES_PATH) return { kind: 'list' }
  if (!trimmed.startsWith(`${RECIPES_PATH}/`)) return null
  const segment = trimmed.slice(RECIPES_PATH.length + 1)
  if (segment === '' || segment.includes('/')) return null
  try {
    return { kind: 'recipe', recipeId: decodeURIComponent(segment) }
  } catch {
    // a broken address: show the list
    return { kind: 'list' }
  }
}
