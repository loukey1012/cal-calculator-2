import { useCurrentUser } from '../../app/currentUser'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { ListRow } from '../../components/ios/ListRow'
import { SearchField } from '../../components/ios/SearchField'
import { toUserMessage } from '../../lib/errors'
import { useMyAppearance } from '../appearance/useMyAppearance'
import { findByBarcode } from '../barcode/barcode'
import { ScanBarcodeButton } from '../barcode/ScanBarcodeButton'
import { CategoryFilterChips } from '../ingredients/CategoryFilterChips'
import { useCategories, useCategoryGroups, useIngredients } from '../ingredients/hooks'
import type { Ingredient } from '../ingredients/ingredientsApi'
import { filterIngredients, nutritionSummary, type IngredientFilter } from '../ingredients/listing'

type FoodPickerProps = {
  /** the search and category, kept by the caller (they survive going to the amount and back) */
  readonly filter: IngredientFilter
  readonly onFilterChange: (filter: IngredientFilter) => void
  readonly onPick: (ingredient: Ingredient) => void
  /** create a missing ingredient, saved to the shared database; maybe for a scanned barcode */
  readonly onNew: (barcode?: string) => void
  readonly onCustom: () => void
}

function Note({ text }: { readonly text: string }) {
  return <p className="mt-6 px-4 text-center text-[15px] text-label-secondary">{text}</p>
}

export function FoodPicker({ filter, onFilterChange, onPick, onNew, onCustom }: FoodPickerProps) {
  const { householdId } = useCurrentUser()
  // a partner may have added ingredients since the list was loaded
  const ingredients = useIngredients(householdId, { alwaysRefresh: true })
  const categories = useCategories(householdId)
  const groups = useCategoryGroups(householdId)
  const { categoryLayout } = useMyAppearance()
  const categoryList = categories.data ?? []
  const matches = filterIngredients(ingredients.data ?? [], filter, categoryList)
  const name = filter.query.trim()

  return (
    <>
      <SearchField
        label="Search ingredients"
        value={filter.query}
        onChange={(query) => onFilterChange({ ...filter, query })}
        accessory={
          <ScanBarcodeButton
            // a known package must be recognised, not created twice
            disabled={!ingredients.data}
            onScanned={(barcode) => {
              // a known package goes straight to its amount
              const known = findByBarcode(ingredients.data ?? [], barcode)
              if (known) onPick(known)
              else onNew(barcode)
            }}
          />
        }
      />
      {categoryList.length > 0 && (
        <CategoryFilterChips
          layout={categoryLayout}
          categories={categoryList}
          groups={groups.data ?? []}
          ingredients={ingredients.data ?? []}
          filter={filter.category}
          onChange={(category) => onFilterChange({ ...filter, category })}
        />
      )}
      <GroupedSection>
        <ListRow
          title="New ingredient"
          subtitle={
            name ? `Save “${name}” to your ingredients` : 'Save a new one to your ingredients'
          }
          onClick={() => onNew()}
        />
        <ListRow
          title="Custom item"
          subtitle="Quick one-off, not saved to your ingredients"
          onClick={onCustom}
        />
      </GroupedSection>
      {ingredients.isError && <ErrorBanner message={toUserMessage(ingredients.error)} />}
      {ingredients.isPending && <Note text="Loading…" />}
      {ingredients.isSuccess && matches.length === 0 && (
        <Note
          text={
            ingredients.data.length === 0
              ? 'No ingredients yet. Add a new one, or use a custom item.'
              : 'No matches.'
          }
        />
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
