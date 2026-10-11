import { useState } from 'react'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { CheckIcon, ChevronDownIcon } from '../../components/ios/icons'
import { ListRow } from '../../components/ios/ListRow'
import { Sheet } from '../../components/ios/Sheet'
import { INGREDIENT_SORT_OPTIONS, type IngredientSort } from './sorting'

type SortMenuProps = {
  readonly sort: IngredientSort
  readonly onChange: (sort: IngredientSort) => void
}

/** The order of the ingredient lists: a button opening the choices. */
export function SortMenu({ sort, onChange }: SortMenuProps) {
  const [open, setOpen] = useState(false)
  const label = INGREDIENT_SORT_OPTIONS.find(({ value }) => value === sort)?.label ?? ''

  return (
    <>
      <button
        type="button"
        aria-label={`Sort: ${label}`}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="flex h-8 shrink-0 items-center gap-1 px-1 text-[14px] font-bold text-accent-ink"
      >
        {label}
        <ChevronDownIcon className="h-3.5 w-3.5" />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Sort by">
        <GroupedSection footer="Applies to the Ingredients tab and the ingredient search on Cook.">
          {INGREDIENT_SORT_OPTIONS.map((option) => (
            <ListRow
              key={option.value}
              title={option.label}
              subtitle={option.hint}
              detail={
                option.value === sort ? <CheckIcon className="h-5 w-5 text-accent-ink" /> : null
              }
              onClick={() => {
                onChange(option.value)
                setOpen(false)
              }}
            />
          ))}
        </GroupedSection>
      </Sheet>
    </>
  )
}
