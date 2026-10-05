import { CategoryChips } from '../ingredients/CategoryChips'
import { GroupedCategoryChips } from '../ingredients/GroupedCategoryChips'
import type { Category } from '../ingredients/ingredientsApi'
import type { ChipGroup } from '../ingredients/listing'
import type { CategoryLayout } from './appearance'

const sampleCategory = (name: string, groupId: string | null = null): Category => ({
  id: name,
  name,
  group_id: groupId,
  household_id: '',
  created_at: '',
})

const SAMPLE_CATEGORIES = [
  'Bread',
  'Dairy',
  'Drinks',
  'Meat & Fish',
  'Sauces',
  'Snacks',
  'Spreads',
  'Veggies & Fruit',
].map((name) => sampleCategory(name))

const SAMPLE_GROUPS: readonly ChipGroup[] = [
  { id: 'carbs', name: 'Bread & Carbs', categories: [sampleCategory('Bread', 'carbs')] },
  {
    id: 'dairy',
    name: 'Dairy & Spreads',
    categories: [sampleCategory('Dairy', 'dairy'), sampleCategory('Spreads', 'dairy')],
  },
  { id: 'fresh', name: 'Fresh', categories: [sampleCategory('Meat & Fish', 'fresh')] },
  { id: 'snacks', name: 'Snacks & Drinks', categories: [sampleCategory('Snacks', 'snacks')] },
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
          filter={{ kind: 'group', id: 'dairy' }}
          onChange={ignore}
          initialOpenId="dairy"
        />
      ) : (
        <CategoryChips
          layout={layout}
          categories={SAMPLE_CATEGORIES}
          selectedId={null}
          onSelect={ignore}
        />
      )}
    </div>
  )
}
