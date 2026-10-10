import { useState } from 'react'
import { useCurrentUser } from '../../app/currentUser'
import { Button } from '../../components/ios/Button'
import { EmptyState } from '../../components/ios/EmptyState'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { PlusIcon } from '../../components/ios/icons'
import { ListRow } from '../../components/ios/ListRow'
import { PageHeader } from '../../components/ios/PageHeader'
import { SearchField } from '../../components/ios/SearchField'
import { toUserMessage } from '../../lib/errors'
import { useMyAppearance } from '../appearance/useMyAppearance'
import { CategoryFilterChips } from './CategoryFilterChips'
import { useCategories, useCategoryGroups, useIngredients } from './hooks'
import type { Ingredient } from './ingredientsApi'
import { findByBarcode } from '../barcode/barcode'
import { ScanBarcodeButton } from '../barcode/ScanBarcodeButton'
import { IngredientSheet } from './IngredientSheet'
import {
  ALL_CATEGORIES,
  filterIngredients,
  groupByCategory,
  nutritionSummary,
  type CategoryFilter,
} from './listing'

/** null ingredient = a new one, maybe for a scanned barcode */
type Editing = { readonly ingredient: Ingredient | null; readonly barcode?: string } | null

export function IngredientsPage() {
  const { householdId } = useCurrentUser()
  const ingredients = useIngredients(householdId)
  const categories = useCategories(householdId)
  const groups = useCategoryGroups(householdId)
  const { categoryLayout } = useMyAppearance()
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>(ALL_CATEGORIES)
  const [editing, setEditing] = useState<Editing>(null)
  const categoryList = categories.data ?? []

  function renderContent() {
    if (ingredients.isPending) {
      return (
        <p className="mt-6 text-center text-[15px] text-label-secondary">
          {ingredients.fetchStatus === 'paused' ? 'Offline – not loaded yet' : 'Loading…'}
        </p>
      )
    }
    if (ingredients.isError && ingredients.data === undefined) {
      return (
        <>
          <ErrorBanner message={toUserMessage(ingredients.error)} />
          <div className="mt-4">
            <Button onClick={() => void ingredients.refetch()}>Try again</Button>
          </div>
        </>
      )
    }
    if (ingredients.data.length === 0) {
      return <EmptyState title="No ingredients yet" message="Tap + to add your first ingredient." />
    }
    const sections = groupByCategory(
      filterIngredients(ingredients.data, { query, category: categoryFilter }, categoryList),
      categoryList,
    )
    if (sections.length === 0) {
      return <EmptyState title="No matches" message="Try a different search or category." />
    }
    return sections.map((section) => (
      <GroupedSection key={section.id} header={section.title}>
        {section.ingredients.map((ingredient) => (
          <ListRow
            key={ingredient.id}
            title={ingredient.name}
            subtitle={[ingredient.brand, nutritionSummary(ingredient)].filter(Boolean).join(' · ')}
            onClick={() => setEditing({ ingredient })}
          />
        ))}
      </GroupedSection>
    ))
  }

  return (
    <>
      <PageHeader
        title="Ingredients"
        action={
          <Button
            variant="plain"
            aria-label="Add ingredient"
            className="-mr-2"
            onClick={() => setEditing({ ingredient: null })}
          >
            <PlusIcon className="h-6 w-6" />
          </Button>
        }
      />
      <SearchField
        label="Search ingredients"
        value={query}
        onChange={setQuery}
        accessory={
          <ScanBarcodeButton
            disabled={!ingredients.data}
            onScanned={(barcode) =>
              setEditing({
                ingredient: findByBarcode(ingredients.data ?? [], barcode),
                barcode,
              })
            }
          />
        }
      />
      {categoryList.length > 0 && (
        <CategoryFilterChips
          layout={categoryLayout}
          categories={categoryList}
          groups={groups.data ?? []}
          ingredients={ingredients.data ?? []}
          filter={categoryFilter}
          onChange={setCategoryFilter}
        />
      )}
      {renderContent()}
      <IngredientSheet
        // the pickers need their lists, or the category would show "None" when it is set
        open={editing !== null && !categories.isPending && !groups.isPending}
        householdId={householdId}
        ingredient={editing?.ingredient ?? null}
        barcode={editing?.barcode ?? null}
        categories={categoryList}
        groups={groups.data ?? []}
        onClose={() => setEditing(null)}
        onOpenIngredient={(ingredient) => setEditing({ ingredient })}
      />
    </>
  )
}
