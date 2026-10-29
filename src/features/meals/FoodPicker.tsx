import { useState } from 'react'
import { useCurrentUser } from '../../app/currentUser'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { SearchField } from '../../components/ios/SearchField'
import { toUserMessage } from '../../lib/errors'
import { useMyAppearance } from '../appearance/useMyAppearance'
import { findByBarcode } from '../barcode/barcode'
import { ScanBarcodeButton } from '../barcode/ScanBarcodeButton'
import { CategoryFilterChips } from '../ingredients/CategoryFilterChips'
import { useCategories, useCategoryGroups, useIngredients } from '../ingredients/hooks'
import type { Ingredient } from '../ingredients/ingredientsApi'
import { IngredientRow } from '../ingredients/IngredientRow'
import { ListOptions } from '../ingredients/ListOptions'
import { filterIngredients, type IngredientFilter } from '../ingredients/listing'
import { useIngredientSort } from '../ingredients/useIngredientSort'

type FoodPickerProps = {
  /** the search and category, kept by the caller (they survive going to the amount and back) */
  readonly filter: IngredientFilter
  readonly onFilterChange: (filter: IngredientFilter) => void
  readonly onPick: (ingredient: Ingredient) => void
  /**
   * create a missing ingredient, saved to the shared database; maybe for a scanned barcode.
   * Without it (swapping a product) only saved ingredients can be picked.
   */
  readonly onNew?: (barcode?: string) => void
}

function Note({ text }: { readonly text: string }) {
  return <p className="mt-6 px-4 text-center text-[15px] text-label-secondary">{text}</p>
}

export function FoodPicker({ filter, onFilterChange, onPick, onNew }: FoodPickerProps) {
  const [unknownScan, setUnknownScan] = useState(false)
  const { householdId } = useCurrentUser()
  // a partner may have added ingredients since the list was loaded
  const ingredients = useIngredients(householdId, { alwaysRefresh: true })
  const categories = useCategories(householdId)
  const groups = useCategoryGroups(householdId)
  const { categoryLayout } = useMyAppearance()
  const categoryList = categories.data ?? []
  const { sort, setSort, sorted } = useIngredientSort(householdId)
  const matches = sorted(filterIngredients(ingredients.data ?? [], filter, categoryList))

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
              setUnknownScan(false)
              if (known) onPick(known)
              else if (onNew) onNew(barcode)
              else setUnknownScan(true)
            }}
          />
        }
      />
      {categoryList.length > 0 && (
        <CategoryFilterChips
          layout={categoryLayout}
          categories={categoryList}
          groups={groups.data ?? []}
          filter={filter.category}
          onChange={(category) => onFilterChange({ ...filter, category })}
        />
      )}
      <ListOptions
        ingredients={ingredients.data ?? []}
        brand={filter.brand}
        onBrandChange={(brand) => onFilterChange({ ...filter, brand })}
        diet={filter.diet}
        onDietChange={(diet) => onFilterChange({ ...filter, diet })}
        sort={sort}
        onSortChange={setSort}
      />
      {unknownScan && (
        <Note text="This package isn’t in your ingredients yet. Add it to the dish with Add ingredient first." />
      )}
      {ingredients.isError && <ErrorBanner message={toUserMessage(ingredients.error)} />}
      {ingredients.isPending && <Note text="Loading…" />}
      {ingredients.isSuccess && matches.length === 0 && (
        <Note
          text={
            ingredients.data.length === 0
              ? 'No ingredients yet. Add one with the + above.'
              : 'No matches.'
          }
        />
      )}
      {matches.length > 0 && (
        <GroupedSection header="Ingredients">
          {matches.map((ingredient) => (
            <IngredientRow
              key={ingredient.id}
              ingredient={ingredient}
              onClick={() => onPick(ingredient)}
            />
          ))}
        </GroupedSection>
      )}
    </>
  )
}
