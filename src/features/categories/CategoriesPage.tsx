import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useCurrentUser } from '../../app/currentUser'
import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { ChevronLeftIcon } from '../../components/ios/icons'
import { ListRow } from '../../components/ios/ListRow'
import { PageHeader } from '../../components/ios/PageHeader'
import { toUserMessage } from '../../lib/errors'
import { useCategories, useCategoryGroups, useIngredients } from '../ingredients/hooks'
import type { Category, CategoryGroup, Ingredient } from '../ingredients/ingredientsApi'
import { CategorySheet, GroupSheet } from './CategorySheets'
import { plural } from './plural'

type Editing =
  | { readonly kind: 'group'; readonly group: CategoryGroup | null }
  | { readonly kind: 'category'; readonly category: Category | null }
  | null

const byName = <T extends { readonly name: string }>(a: T, b: T) => a.name.localeCompare(b.name)

function countBy<T>(
  items: readonly T[],
  key: (item: T) => string | null,
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>()
  for (const item of items) {
    const id = key(item)
    if (id !== null) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return counts
}

type ListsProps = {
  readonly groups: readonly CategoryGroup[]
  readonly categories: readonly Category[]
  readonly ingredients: readonly Ingredient[]
  readonly onEdit: (editing: Editing) => void
}

/** The broad categories, then each with its categories; ungrouped ones under "Other". */
function CategoryLists({ groups, categories, ingredients, onEdit }: ListsProps) {
  const sortedGroups = [...groups].sort(byName)
  const sortedCategories = [...categories].sort(byName)
  const categoriesPerGroup = countBy(categories, (category) => category.group_id)
  const ingredientsPerCategory = countBy(ingredients, (ingredient) => ingredient.category_id)
  const knownGroupIds = new Set(groups.map((group) => group.id))
  const ungrouped = sortedCategories.filter(
    (category) => category.group_id === null || !knownGroupIds.has(category.group_id),
  )

  const categoryRow = (category: Category) => (
    <ListRow
      key={category.id}
      title={category.name}
      detail={plural(ingredientsPerCategory.get(category.id) ?? 0, 'ingredient', 'ingredients')}
      onClick={() => onEdit({ kind: 'category', category })}
    />
  )

  return (
    <>
      <GroupedSection header="Broad categories">
        {sortedGroups.length === 0 && <ListRow title="None yet" />}
        {sortedGroups.map((group) => (
          <ListRow
            key={group.id}
            title={group.name}
            detail={plural(categoriesPerGroup.get(group.id) ?? 0, 'category', 'categories')}
            onClick={() => onEdit({ kind: 'group', group })}
          />
        ))}
      </GroupedSection>
      <div className="mt-2">
        <Button variant="plain" onClick={() => onEdit({ kind: 'group', group: null })}>
          Add Broad Category
        </Button>
      </div>
      {sortedGroups.map((group) => {
        const members = sortedCategories.filter((category) => category.group_id === group.id)
        return (
          <GroupedSection key={group.id} header={group.name}>
            {members.length === 0 ? (
              <ListRow title="No categories yet" />
            ) : (
              members.map(categoryRow)
            )}
          </GroupedSection>
        )
      })}
      {ungrouped.length > 0 && (
        <GroupedSection header="Other">{ungrouped.map(categoryRow)}</GroupedSection>
      )}
      <div className="mt-2">
        <Button variant="plain" onClick={() => onEdit({ kind: 'category', category: null })}>
          Add Category
        </Button>
      </div>
    </>
  )
}

/** Settings › Categories: the household's broad categories and categories. */
export function CategoriesPage() {
  const { householdId } = useCurrentUser()
  const navigate = useNavigate()
  const groups = useCategoryGroups(householdId)
  const categories = useCategories(householdId)
  const ingredients = useIngredients(householdId)
  const [editing, setEditing] = useState<Editing>(null)
  const loadError = groups.error ?? categories.error ?? ingredients.error
  const close = () => setEditing(null)

  function renderContent() {
    if (groups.data && categories.data && ingredients.data) {
      return (
        <CategoryLists
          groups={groups.data}
          categories={categories.data}
          ingredients={ingredients.data}
          onEdit={setEditing}
        />
      )
    }
    if (loadError) return <ErrorBanner message={toUserMessage(loadError)} />
    return <p className="mt-6 text-center text-[15px] text-label-secondary">Loading…</p>
  }

  return (
    <>
      <PageHeader
        title="Categories"
        leading={
          <Button
            variant="plain"
            className="-ml-2 flex items-center gap-0.5"
            onClick={() => navigate('/settings', { replace: true })}
          >
            <ChevronLeftIcon className="h-5 w-5" />
            Settings
          </Button>
        }
      />
      <p className="text-[14px] font-medium text-label-secondary">
        Broad categories hold your categories, e.g. Fresh › Meat & Fish. The Grouped category chips
        on the Ingredients page show them.
      </p>
      {renderContent()}
      {editing?.kind === 'group' && (
        <GroupSheet
          householdId={householdId}
          group={editing.group}
          categoryCount={
            (categories.data ?? []).filter((category) => category.group_id === editing.group?.id)
              .length
          }
          onClose={close}
        />
      )}
      {editing?.kind === 'category' && (
        <CategorySheet
          householdId={householdId}
          category={editing.category}
          groups={[...(groups.data ?? [])].sort(byName)}
          ingredientCount={
            (ingredients.data ?? []).filter(
              (ingredient) => ingredient.category_id === editing.category?.id,
            ).length
          }
          onClose={close}
        />
      )}
    </>
  )
}
