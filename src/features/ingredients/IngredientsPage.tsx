import { useState, type ReactNode } from 'react'
import { useCurrentUser } from '../../app/currentUser'
import { usePagePath } from '../../app/pagePath'
import { useStackNavigate } from '../../app/stackNavigate'
import { BackButton } from '../../components/ios/BackButton'
import { SegmentedControl } from '../../components/ios/SegmentedControl'
import { recipePageOf, recipePath } from '../cook/recipePages'
import { RecipePage } from '../recipes/RecipePage'
import { RecipesList } from '../recipes/RecipesList'
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
import { ScanBarcodeButton } from '../barcode/ScanBarcodeButton'
import { IngredientRow } from './IngredientRow'
import { IngredientSheet } from './IngredientSheet'
import { ListOptions } from './ListOptions'
import { recentWindowStart, updatedMealsMessage } from './recentMeals'
import { useApplyToRecentMeals } from './useApplyToRecentMeals'
import { useIngredientSort } from './useIngredientSort'
import { ALL_CATEGORIES, filterIngredients, groupByCategory, type CategoryFilter } from './listing'

/** null ingredient = a new one, maybe for a scanned barcode */
type Editing = { readonly ingredient: Ingredient | null; readonly barcode?: string } | null

const INGREDIENTS_PATH = '/ingredients'
const RECIPES_PATH = '/ingredients/recipes'
const VIEW_OPTIONS = [
  { value: 'ingredients', label: 'Ingredients' },
  { value: 'recipes', label: 'Recipes' },
] as const

/** Ingredients or Recipes (the saved ones, managed here), and a recipe opened on top. */
export function IngredientsPage() {
  const recipePage = recipePageOf(usePagePath(), RECIPES_PATH)
  const go = useStackNavigate()
  if (recipePage?.kind === 'recipe') {
    return (
      <RecipePage
        recipeId={recipePage.recipeId}
        leading={<BackButton label="Recipes" onClick={() => go(RECIPES_PATH)} />}
        onDeleted={() => go(RECIPES_PATH)}
      />
    )
  }
  const views = (
    <div className="mb-3">
      <SegmentedControl
        label="Show"
        options={VIEW_OPTIONS}
        value={recipePage ? 'recipes' : 'ingredients'}
        onChange={(view) => go(view === 'recipes' ? RECIPES_PATH : INGREDIENTS_PATH)}
      />
    </div>
  )
  if (!recipePage) return <IngredientList views={views} />
  return (
    <>
      <PageHeader title="Recipes" />
      {views}
      <RecipesList leading={null} onOpen={(recipeId) => go(recipePath(RECIPES_PATH, recipeId))} />
    </>
  )
}

function IngredientList({ views }: { readonly views: ReactNode }) {
  const { householdId } = useCurrentUser()
  const ingredients = useIngredients(householdId)
  const categories = useCategories(householdId)
  const groups = useCategoryGroups(householdId)
  const { categoryLayout } = useMyAppearance()
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>(ALL_CATEGORIES)
  const [brand, setBrand] = useState<string | null>(null)
  const { sort, setSort, sorted } = useIngredientSort(householdId)
  const [editing, setEditing] = useState<Editing>(null)
  const [reviewing, setReviewing] = useState(false)
  const findings = useOpenFindings(householdId)
  const openFindings = findings.data?.length ?? 0
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
      { query, category: categoryFilter, brand },
      categoryList,
    )
    if (matches.length === 0) {
      return <EmptyState title="No matches" message="Try a different search, category or brand." />
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
        action={
          <div className="flex items-center gap-1">
            <ReviewButton count={openFindings} onClick={() => setReviewing(true)} />
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
      {views}
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
        onClose={() => setEditing(null)}
        onOpenIngredient={(ingredient) => setEditing({ ingredient })}
        onUpdated={followInRecentMeals}
      />
      <ReviewSheet
        open={reviewing}
        findings={findings.data ?? []}
        ingredients={ingredients.data ?? []}
        onClose={() => setReviewing(false)}
        onOpenIngredient={(ingredient) => {
          setReviewing(false)
          setEditing({ ingredient })
        }}
        onUpdated={followInRecentMeals}
      />
      <Toast message={toast.message} onDone={toast.hide} />
    </>
  )
}
