import { useState } from 'react'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { ListRow } from '../../components/ios/ListRow'
import { SearchField } from '../../components/ios/SearchField'
import type { Ingredient } from './ingredientsApi'
import { ALL_CATEGORIES, filterIngredients, nutritionSummary } from './listing'

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
  const matches = [...filterIngredients(ingredients, { query, category: ALL_CATEGORIES })]
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
            <ListRow
              key={ingredient.id}
              title={ingredient.name}
              subtitle={[ingredient.brand, nutritionSummary(ingredient)]
                .filter(Boolean)
                .join(' · ')}
              onClick={() => onPick(ingredient)}
            />
          ))}
        </GroupedSection>
      )}
    </div>
  )
}
