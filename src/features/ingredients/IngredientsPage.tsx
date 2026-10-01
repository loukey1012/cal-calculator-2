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
import { useCategories, useIngredients } from './hooks'
import type { Category, Ingredient } from './ingredientsApi'
import { IngredientSheet } from './IngredientSheet'
import { filterIngredients, groupByCategory, nutritionSummary } from './listing'

type Editing = { readonly ingredient: Ingredient | null } | null

type CategoryChipsProps = {
  readonly categories: readonly Category[]
  readonly selectedId: string | null
  readonly onSelect: (categoryId: string | null) => void
}

function CategoryChips({ categories, selectedId, onSelect }: CategoryChipsProps) {
  const chips = [{ id: null, name: 'All' }, ...categories]
  return (
    // horizontal scrolling here must not switch tabs
    <div
      role="group"
      aria-label="Categories"
      data-swipe-lock=""
      className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1"
    >
      {chips.map((chip) => {
        const selected = chip.id === selectedId
        return (
          <button
            key={chip.id ?? 'all'}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(chip.id)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[15px] ${
              selected ? 'bg-accent text-white' : 'bg-bg-elevated text-label'
            }`}
          >
            {chip.name}
          </button>
        )
      })}
    </div>
  )
}

export function IngredientsPage() {
  const { householdId } = useCurrentUser()
  const ingredients = useIngredients(householdId)
  const categories = useCategories(householdId)
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Editing>(null)
  const categoryList = categories.data ?? []

  function renderContent() {
    if (ingredients.isPending) {
      return <p className="mt-6 text-center text-[15px] text-label-secondary">Loading…</p>
    }
    if (ingredients.isError) {
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
      filterIngredients(ingredients.data, { query, categoryId }),
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
      <SearchField label="Search ingredients" value={query} onChange={setQuery} />
      {categoryList.length > 0 && (
        <CategoryChips categories={categoryList} selectedId={categoryId} onSelect={setCategoryId} />
      )}
      {renderContent()}
      <IngredientSheet
        // the category picker needs the categories, or it would show "None" for a set category
        open={editing !== null && !categories.isPending}
        householdId={householdId}
        ingredient={editing?.ingredient ?? null}
        categories={categoryList}
        onClose={() => setEditing(null)}
      />
    </>
  )
}
