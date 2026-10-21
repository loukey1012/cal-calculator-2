import { CategoryChips } from '../ingredients/CategoryChips'
import { GroupedCategoryChips } from '../ingredients/GroupedCategoryChips'
import type { Category } from '../ingredients/ingredientsApi'
import type { ChipGroup } from '../ingredients/listing'
import type { CategoryLayout } from './appearance'

const sampleCategory = (name: string, groupId: string): Category => ({
  id: name,
  name,
  group_id: groupId,
  household_id: '',
  created_at: '',
})

const sampleGroup = (name: string, categories: readonly string[]): ChipGroup => ({
  id: name,
  name,
  categories: categories.map((category) => sampleCategory(category, name)),
})

const SAMPLE_GROUPS: readonly ChipGroup[] = [
  sampleGroup('Bread', ['Brot & Gebäck', 'Toast & Buns']),
  sampleGroup('Carbs', ['Pasta']),
  sampleGroup('Dairy & Alternatives', ['Cheese', 'Joghurt & Topfen', 'Milk', 'Oat Milk']),
  sampleGroup('Drinks', ['Energy Drinks']),
  sampleGroup('Meat', ['Wurst']),
  sampleGroup('Snacks', ['Chocolate']),
]

const ignore = () => {}

/** A picture of the Ingredients category filter in the given layout: not tappable. */
export function CategoryChipsPreview({ layout }: { readonly layout: CategoryLayout }) {
  return (
    // read out as one image
    <div
      role="img"
      aria-label="Category chips preview"
      inert
      className="mb-3 overflow-hidden rounded-[20px] bg-bg px-4 pb-3 shadow-card"
    >
      {layout === 'grouped' ? (
        <GroupedCategoryChips
          groups={SAMPLE_GROUPS}
          filter={{ kind: 'group', id: 'Dairy & Alternatives' }}
          onChange={ignore}
          initialOpenId="Dairy & Alternatives"
        />
      ) : (
        <CategoryChips layout={layout} items={SAMPLE_GROUPS} selectedId={null} onSelect={ignore} />
      )}
    </div>
  )
}
