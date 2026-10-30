import { useMemo, useState } from 'react'
import { useCurrentUser } from '../../app/currentUser'
import { Button } from '../../components/ios/Button'
import { EmptyState } from '../../components/ios/EmptyState'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { PlusIcon } from '../../components/ios/icons'
import { PageHeader } from '../../components/ios/PageHeader'
import { SearchField } from '../../components/ios/SearchField'
import { Toast } from '../../components/ios/Toast'
import { useToast } from '../../components/ios/useToast'
import { toUserMessage } from '../../lib/errors'
import { useMyAppearance } from '../appearance/useMyAppearance'
import { useToday } from '../today/useToday'
import { CategoryFilterChips } from './CategoryFilterChips'
import { useCategories, useCategoryGroups, useIngredients } from './hooks'
import type { Ingredient } from './ingredientsApi'
import { findByBarcode } from '../barcode/barcode'
import { useOpenFindings } from '../review/hooks'
import { ReviewButton } from '../review/ReviewButton'
import { ReviewSheet } from '../review/ReviewSheet'
import { findingStillApplies } from '../review/stillApplies'
import { ScanBarcodeButton } from '../barcode/ScanBarcodeButton'
import { IngredientRow } from './IngredientRow'
import { IngredientSheet } from './IngredientSheet'
import { ListOptions } from './ListOptions'
import { recentWindowStart, updatedMealsMessage } from './recentMeals'
import { useApplyToRecentMeals } from './useApplyToRecentMeals'
import { useIngredientSort } from './useIngredientSort'
import {
  ALL_CATEGORIES,
  filterIngredients,
  groupByCategory,
  type CategoryFilter,
  type DietFilter,
} from './listing'

/** null ingredient = a new one, maybe for a scanned barcode */
type Editing = {
  readonly ingredient: Ingredient | null
  readonly barcode?: string
  /** set when opened from Review: closing the sheet goes back there */
  readonly from?: 'review'
} | null

/** The household's saved ingredients, with search, filters and Review. */
export function IngredientsPage() {
  return <IngredientList />
}

function IngredientList() {
  const { householdId } = useCurrentUser()
  const ingredients = useIngredients(householdId)
  const categories = useCategories(householdId)
  const groups = useCategoryGroups(householdId)
  const { categoryLayout } = useMyAppearance()
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>(ALL_CATEGORIES)
  const [brand, setBrand] = useState<string | null>(null)
  const [diet, setDiet] = useState<DietFilter>({})
  const { sort, setSort, sorted } = useIngredientSort(householdId)
  const [editing, setEditing] = useState<Editing>(null)
  const [reviewing, setReviewing] = useState(false)
  const findings = useOpenFindings(householdId)
  // findings the user already fixed themselves are left out of both the count and the sheet
  const openFindings = useMemo(() => {
    const byId = new Map((ingredients.data ?? []).map((item) => [item.id, item]))
    return (findings.data ?? []).filter((finding) =>
      findingStillApplies(
        finding,
        finding.ingredient_id ? byId.get(finding.ingredient_id) : undefined,
        byId,
      ),
    )
  }, [findings.data, ingredients.data])
  const today = useToday()
  const toast = useToast()
  const applyToRecent = useApplyToRecentMeals()
  const categoryList = categories.data ?? []

  // an edited ingredient (in its sheet or by a review fix) updates recent meals too
  function followInRecentMeals(ingredient: Ingredient) {
    applyToRecent.mutate(
      { ingredient, since: recentWindowStart(today) },
      {
        onSuccess: (meals) => {
          const message = updatedMealsMessage(meals.length)
          if (message) toast.show(message)
        },
        onError: (error) => toast.show(`Recent meals weren’t updated: ${toUserMessage(error)}`),
      },
    )
  }

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
    const matches = filterIngredients(
      ingredients.data,
      { query, category: categoryFilter, brand, diet },
      categoryList,
    )
    if (matches.length === 0) {
      return <EmptyState title="No matches" message="Try a different search, category or filter." />
    }
    const row = (ingredient: Ingredient) => (
      <IngredientRow
        key={ingredient.id}
        ingredient={ingredient}
        onClick={() => setEditing({ ingredient })}
      />
    )
    // A–Z keeps the categories; any other order is one list, or it would only order within them
    if (sort !== 'name') return <GroupedSection>{sorted(matches).map(row)}</GroupedSection>
    return groupByCategory(matches, categoryList).map((section) => (
      <GroupedSection key={section.id} header={section.title}>
        {section.ingredients.map(row)}
      </GroupedSection>
    ))
  }

  return (
    <>
      <PageHeader
        title="Ingredients"
        titleAccessory={
          <div className="flex items-center gap-1">
            <ReviewButton count={openFindings.length} onClick={() => setReviewing(true)} />
            <Button
              variant="plain"
              aria-label="Add ingredient"
              className="-mr-2"
              onClick={() => setEditing({ ingredient: null })}
            >
              <PlusIcon className="h-6 w-6" />
            </Button>
          </div>
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
          filter={categoryFilter}
          onChange={setCategoryFilter}
        />
      )}
      <ListOptions
        ingredients={ingredients.data ?? []}
        brand={brand}
        onBrandChange={setBrand}
        diet={diet}
        onDietChange={setDiet}
        sort={sort}
        onSortChange={setSort}
      />
      {renderContent()}
      <IngredientSheet
        // the pickers need their lists, or the category would show "None" when it is set
        open={editing !== null && !categories.isPending && !groups.isPending}
        householdId={householdId}
        ingredient={editing?.ingredient ?? null}
        barcode={editing?.barcode ?? null}
        categories={categoryList}
        groups={groups.data ?? []}
        onClose={() => {
          if (editing?.from === 'review') setReviewing(true)
          setEditing(null)
        }}
        onOpenIngredient={(ingredient) => setEditing({ ingredient, from: editing?.from })}
        onUpdated={followInRecentMeals}
        onMerged={(kept, valuesChanged) => {
          toast.show(`Merged into ${kept.name}.`)
          // values taken over from the other one reach recent meals like any edit
          if (valuesChanged) followInRecentMeals(kept)
        }}
      />
      <ReviewSheet
        open={reviewing}
        findings={openFindings}
        ingredients={ingredients.data ?? []}
        onClose={() => setReviewing(false)}
        onOpenIngredient={(ingredient) => {
          setReviewing(false)
          setEditing({ ingredient, from: 'review' })
        }}
        onUpdated={followInRecentMeals}
      />
      <Toast message={toast.message} onDone={toast.hide} />
    </>
  )
}
