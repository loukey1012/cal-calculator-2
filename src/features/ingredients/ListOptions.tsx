import { BrandFilter } from './BrandFilter'
import { CHECK_VALUES_LABEL } from './IngredientRow'
import type { Ingredient } from './ingredientsApi'
import type { IngredientSort } from './sorting'
import { SortMenu } from './SortMenu'

type ListOptionsProps = {
  readonly ingredients: readonly Ingredient[]
  readonly brand: string | null
  readonly onBrandChange: (brand: string | null) => void
  readonly sort: IngredientSort
  readonly onSortChange: (sort: IngredientSort) => void
  /** ingredients whose values look wrong: a chip showing only those, while there are any */
  readonly check?: {
    readonly count: number
    readonly only: boolean
    readonly onChange: (only: boolean) => void
  }
  /** open findings of the ingredient review: a chip opening them, while there are any */
  readonly review?: { readonly count: number; readonly onOpen: () => void }
}

/** The line under the category chips of both ingredient lists: which brand, in which order. */
export function ListOptions({
  ingredients,
  brand,
  onBrandChange,
  sort,
  onSortChange,
  check,
  review,
}: ListOptionsProps) {
  if (ingredients.length === 0) return null
  return (
    <div className="mt-3 flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <BrandFilter ingredients={ingredients} brand={brand} onChange={onBrandChange} />
        {check && (check.count > 0 || check.only) && (
          <button
            type="button"
            aria-label={`${CHECK_VALUES_LABEL}: ${check.count}`}
            aria-pressed={check.only}
            onClick={() => check.onChange(!check.only)}
            className={`glass-surface h-8 shrink-0 rounded-full px-3 text-[14px] font-bold ${
              check.only
                ? 'bg-destructive text-white'
                : 'bg-bg-elevated text-destructive shadow-card'
            }`}
          >
            {CHECK_VALUES_LABEL} · {check.count}
          </button>
        )}
        {review && review.count > 0 && (
          <button
            type="button"
            aria-label={`Review: ${review.count}`}
            onClick={review.onOpen}
            className="glass-surface h-8 shrink-0 rounded-full bg-bg-elevated px-3 text-[14px] font-bold text-accent-ink shadow-card"
          >
            Review · {review.count}
          </button>
        )}
      </div>
      <SortMenu sort={sort} onChange={onSortChange} />
    </div>
  )
}
