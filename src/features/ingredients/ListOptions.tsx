import { BrandFilter } from './BrandFilter'
import { HIT_AREA_44 } from './hitArea'
import { FilterChip } from './FilterChip'
import type { Ingredient } from './ingredientsApi'
import type { DietFilter } from './listing'
import type { IngredientSort } from './sorting'
import { SortMenu } from './SortMenu'

const DIET_CHIPS = [
  { key: 'vegan', label: 'Vegan' },
  { key: 'halal', label: 'Halal' },
] as const

type ListOptionsProps = {
  readonly ingredients: readonly Ingredient[]
  readonly brand: string | null
  readonly onBrandChange: (brand: string | null) => void
  /** only vegan and/or halal ingredients */
  readonly diet: DietFilter | undefined
  readonly onDietChange: (diet: DietFilter) => void
  readonly sort: IngredientSort
  readonly onSortChange: (sort: IngredientSort) => void
}

/** The line under the category chips of both ingredient lists: which brand, vegan / halal, in which order. */
export function ListOptions({
  ingredients,
  brand,
  onBrandChange,
  diet,
  onDietChange,
  sort,
  onSortChange,
}: ListOptionsProps) {
  if (ingredients.length === 0) return null
  return (
    <div className="mt-3 flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <BrandFilter ingredients={ingredients} brand={brand} onChange={onBrandChange} />
        {DIET_CHIPS.map(({ key, label }) => (
          <FilterChip
            key={key}
            chipKey={key}
            selected={diet?.[key] === true}
            onClick={() => onDietChange({ ...diet, [key]: diet?.[key] !== true })}
            className={`${HIT_AREA_44} h-8 shrink-0 px-3 text-[14px]`}
          >
            {label}
          </FilterChip>
        ))}
      </div>
      <SortMenu sort={sort} onChange={onSortChange} />
    </div>
  )
}
