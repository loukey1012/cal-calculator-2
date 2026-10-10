import type { Ingredient } from '../ingredients/ingredientsApi'
import { searchable } from '../ingredients/listing'

// shorter words ("de", "mit") say little about the product
const MIN_WORD_LENGTH = 3

function words(text: string): ReadonlySet<string> {
  return new Set(
    searchable(text)
      .split(/[^\p{L}\p{N}]+/u)
      .filter((word) => word.length >= MIN_WORD_LENGTH),
  )
}

type Match = { readonly ingredient: Ingredient; readonly score: number }

function score(candidate: Ingredient, scanned: ReadonlySet<string>, brand: string): number {
  const ownBrand = searchable(candidate.brand ?? '')
  // another brand is another product, e.g. Milbona's skyr isn't Arla's
  if (ownBrand !== '' && brand !== '' && ownBrand !== brand) return 0
  const sameBrand = ownBrand !== '' && ownBrand === brand
  const own = words(candidate.name)
  const shared = [...own].filter((word) => scanned.has(word)).length
  if (shared === 0) return 0
  const allWords = shared === own.size
  // without the same brand, the saved name must cover at least half of the product's words
  // ("Milch" isn't "Milch Schokolade Drink")
  const coversProduct = shared * 2 >= scanned.size
  if (sameBrand ? shared * 2 < own.size : !(allWords && coversProduct)) return 0
  return shared + (sameBrand ? 1 : 0) + (allWords ? 1 : 0)
}

/**
 * The saved ingredient a scanned (but unknown) product most likely is, e.g. "Skyr" by Milbona for
 * "Skyr Natur" by Milbona. Only ingredients without a barcode yet are suggested.
 */
export function likelyMatch(
  ingredients: readonly Ingredient[],
  productName: string,
  productBrand: string,
): Ingredient | null {
  const scanned = words(productName)
  if (scanned.size === 0) return null
  const brand = searchable(productBrand)
  const best = ingredients
    .filter((ingredient) => ingredient.barcode === null)
    .map((ingredient): Match => ({ ingredient, score: score(ingredient, scanned, brand) }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score || a.ingredient.name.localeCompare(b.ingredient.name))
  return best[0]?.ingredient ?? null
}
