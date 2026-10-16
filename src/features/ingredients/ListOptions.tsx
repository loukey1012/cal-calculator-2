import { BrandFilter } from './BrandFilter'
import type { Ingredient } from './ingredientsApi'
import type { IngredientSort } from './sorting'
import { SortMenu } from './SortMenu'

type ListOptionsProps = {
  readonly ingredients: readonly Ingredient[]
  readonly brand: string | null
  readonly onBrandChange: (brand: string | null) => void
  readonly sort: IngredientSort
  readonly onSortChange: (sort: IngredientSort) => void
}

/** The line under the category chips of both ingredient lists: which brand, in which order. */
export function ListOptions({
  ingredients,
  brand,
  onBrandChange,
  sort,
  onSortChange,
}: ListOptionsProps) {
  if (ingredients.length === 0) return null
  return (
    <div className="mt-3 flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <BrandFilter ingredients={ingredients} brand={brand} onChange={onBrandChange} />
      </div>
      <SortMenu sort={sort} onChange={onSortChange} />
    </div>
  )
}
