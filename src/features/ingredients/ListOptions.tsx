import { BrandFilter } from './BrandFilter'
import type { Ingredient } from './ingredientsApi'

type ListOptionsProps = {
  readonly ingredients: readonly Ingredient[]
  readonly brand: string | null
  readonly onBrandChange: (brand: string | null) => void
}

/** The line under the category chips of both ingredient lists: which brand. */
export function ListOptions({ ingredients, brand, onBrandChange }: ListOptionsProps) {
  if (ingredients.length === 0) return null
  return (
    <div className="mt-3 flex items-center justify-between gap-2">
      <BrandFilter ingredients={ingredients} brand={brand} onChange={onBrandChange} />
    </div>
  )
}
