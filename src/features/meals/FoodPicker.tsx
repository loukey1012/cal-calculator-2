import { useState } from 'react'
import { useCurrentUser } from '../../app/currentUser'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { ListRow } from '../../components/ios/ListRow'
import { SearchField } from '../../components/ios/SearchField'
import { toUserMessage } from '../../lib/errors'
import { useIngredients } from '../ingredients/hooks'
import type { Ingredient } from '../ingredients/ingredientsApi'
import { ALL_CATEGORIES, filterIngredients, nutritionSummary } from '../ingredients/listing'

type FoodPickerProps = {
  readonly onPick: (ingredient: Ingredient) => void
  readonly onCustom: () => void
}

export function FoodPicker({ onPick, onCustom }: FoodPickerProps) {
  const { householdId } = useCurrentUser()
  // a partner may have added ingredients since the list was loaded
  const ingredients = useIngredients(householdId, { alwaysRefresh: true })
  const [query, setQuery] = useState('')
  const matches = filterIngredients(ingredients.data ?? [], { query, category: ALL_CATEGORIES })

  return (
    <>
      <SearchField label="Search ingredients" value={query} onChange={setQuery} />
      <GroupedSection>
        <ListRow
          title="Custom item"
          subtitle="Quick one-off, not saved to your ingredients"
          onClick={onCustom}
        />
      </GroupedSection>
      {ingredients.isError && <ErrorBanner message={toUserMessage(ingredients.error)} />}
      {ingredients.isPending && (
        <p className="mt-6 text-center text-[15px] text-label-secondary">Loading…</p>
      )}
      {ingredients.isSuccess && matches.length === 0 && (
        <p className="mt-6 px-4 text-center text-[15px] text-label-secondary">
          {ingredients.data.length === 0
            ? 'No ingredients yet. Use a custom item, or add ingredients in the Ingredients tab.'
            : 'No matches.'}
        </p>
      )}
      {matches.length > 0 && (
        <GroupedSection header="Ingredients">
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
    </>
  )
}
