import { useState } from 'react'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { SearchField } from '../../components/ios/SearchField'
import type { Ingredient } from './ingredientsApi'
import { IngredientRow } from './IngredientRow'
import { ALL_CATEGORIES, filterIngredients } from './listing'

// enough to find one by scrolling a little; typing narrows it down
const MAX_SHOWN = 8

type IngredientPickListProps = {
  readonly label: string
  readonly ingredients: readonly Ingredient[]
  readonly onPick: (ingredient: Ingredient) => void
}

/** A search over saved ingredients with their matches, to pick one of them. */
export function IngredientPickList({ label, ingredients, onPick }: IngredientPickListProps) {
  const [query, setQuery] = useState('')
  const matches = [
    ...filterIngredients(ingredients, { query, category: ALL_CATEGORIES, brand: null }),
  ]
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, MAX_SHOWN)
  return (
    <div className="mt-3">
      <SearchField label={label} value={query} onChange={setQuery} onSubmit={() => undefined} />
      {matches.length === 0 ? (
        <p className="mt-3 px-4 text-[15px] text-label-secondary">No matches.</p>
      ) : (
        <GroupedSection>
          {matches.map((ingredient) => (
            <IngredientRow
              key={ingredient.id}
              ingredient={ingredient}
              onClick={() => onPick(ingredient)}
            />
          ))}
        </GroupedSection>
      )}
    </div>
  )
}
