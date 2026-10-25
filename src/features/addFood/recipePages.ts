/**
 * The recipe pages below a base address: a meal's Add from recipe (to cook one) or Ingredients ›
 * Recipes (to manage them). The list is the base itself, a recipe one level below.
 */
type RecipePageRef =
  { readonly kind: 'list' } | { readonly kind: 'recipe'; readonly recipeId: string }

export function recipePath(base: string, recipeId: string): string {
  return `${base}/${encodeURIComponent(recipeId)}`
}

/** The recipe page an address below `base` shows, or null for anything else. */
export function recipePageOf(path: string, base: string): RecipePageRef | null {
  const trimmed = path.replace(/\/+$/, '')
  if (trimmed === base) return { kind: 'list' }
  if (!trimmed.startsWith(`${base}/`)) return null
  const segment = trimmed.slice(base.length + 1)
  if (segment === '' || segment.includes('/')) return null
  try {
    return { kind: 'recipe', recipeId: decodeURIComponent(segment) }
  } catch {
    // a broken address: show the list
    return { kind: 'list' }
  }
}
