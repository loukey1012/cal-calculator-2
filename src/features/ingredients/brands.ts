import type { Ingredient } from './ingredientsApi'
import { searchable } from './listing'

const MAX_SUGGESTIONS = 6

export type BrandCount = { readonly brand: string; readonly count: number }

/** Each saved brand once, in the spelling used most often (ties: the first one seen). */
function savedBrands(ingredients: readonly Ingredient[]): string[] {
  return brandCounts(ingredients).map(({ brand }) => brand)
}

/** Each saved brand once, alphabetically, in its most used spelling, with how many have it. */
export function brandCounts(ingredients: readonly Ingredient[]): BrandCount[] {
  const spellings = new Map<string, Map<string, number>>()
  for (const { brand } of ingredients) {
    const spelling = brand?.trim()
    if (!spelling) continue
    const key = searchable(spelling)
    const counts = spellings.get(key) ?? new Map<string, number>()
    counts.set(spelling, (counts.get(spelling) ?? 0) + 1)
    spellings.set(key, counts)
  }
  return [...spellings.values()]
    .map((counts) => ({
      brand: [...counts].reduce((best, next) => (next[1] > best[1] ? next : best))[0],
      count: [...counts.values()].reduce((sum, count) => sum + count, 0),
    }))
    .toSorted((a, b) => a.brand.localeCompare(b.brand))
}

/**
 * Saved brands for what is typed: those starting with it first, then those containing it, each
 * alphabetically; case and accents don't matter. None once the text is exactly a saved brand.
 */
export function brandSuggestions(ingredients: readonly Ingredient[], typed: string): string[] {
  const query = searchable(typed)
  if (query === '') return []
  const brands = savedBrands(ingredients)
  // a differently written match is still offered, so it can be tapped to fix the spelling
  if (brands.includes(typed.trim())) return []
  const matching = brands.filter((brand) => searchable(brand).includes(query))
  const starts = (brand: string) => searchable(brand).startsWith(query)
  return matching
    .toSorted((a, b) => Number(starts(b)) - Number(starts(a)) || a.localeCompare(b))
    .slice(0, MAX_SUGGESTIONS)
}
