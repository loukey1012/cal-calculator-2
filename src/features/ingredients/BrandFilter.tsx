import { useState } from 'react'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { CheckIcon, ChevronDownIcon, ClearIcon } from '../../components/ios/icons'
import { ListRow } from '../../components/ios/ListRow'
import { SearchField } from '../../components/ios/SearchField'
import { Sheet } from '../../components/ios/Sheet'
import { brandCounts } from './brands'
import type { Ingredient } from './ingredientsApi'
import { searchable } from './listing'

const ALL_BRANDS_LABEL = 'All brands'

type BrandFilterProps = {
  readonly ingredients: readonly Ingredient[]
  /** the chosen brand, or null for every brand */
  readonly brand: string | null
  readonly onChange: (brand: string | null) => void
}

/** Shows one brand only: a button opening the saved brands, and a clear button once one is chosen. */
export function BrandFilter({ ingredients, brand, onChange }: BrandFilterProps) {
  const [open, setOpen] = useState(false)
  const label = brand ?? ALL_BRANDS_LABEL

  function choose(next: string | null) {
    onChange(next)
    setOpen(false)
  }

  return (
    <div className="flex min-w-0 items-center gap-1">
      <button
        type="button"
        aria-label={`Brand: ${label}`}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={`glass-surface flex h-8 min-w-0 items-center gap-1 rounded-full px-3 text-[14px] font-bold ${
          brand === null
            ? 'bg-bg-elevated text-label shadow-card'
            : 'accent-edge bg-accent text-on-accent'
        }`}
      >
        <span className="truncate">{label}</span>
        <ChevronDownIcon className="h-3.5 w-3.5 shrink-0" />
      </button>
      {brand !== null && (
        <button
          type="button"
          aria-label="Show all brands"
          onClick={() => onChange(null)}
          className="grid h-8 w-8 shrink-0 place-items-center text-label-secondary"
        >
          <ClearIcon className="h-[18px] w-[18px]" />
        </button>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title="Brand">
        <BrandList ingredients={ingredients} brand={brand} onChoose={choose} />
      </Sheet>
    </div>
  )
}

type BrandListProps = {
  readonly ingredients: readonly Ingredient[]
  readonly brand: string | null
  readonly onChoose: (brand: string | null) => void
}

function BrandList({ ingredients, brand, onChoose }: BrandListProps) {
  const [query, setQuery] = useState('')
  const needle = searchable(query)
  const chosen = brand === null ? null : searchable(brand)
  const brands = brandCounts(ingredients).filter(({ brand: name }) =>
    searchable(name).includes(needle),
  )
  const check = <CheckIcon className="h-5 w-5 text-accent-ink" />

  return (
    <>
      <SearchField label="Search brands" value={query} onChange={setQuery} />
      <GroupedSection>
        {needle === '' && (
          <ListRow
            title={ALL_BRANDS_LABEL}
            detail={chosen === null ? check : undefined}
            onClick={() => onChoose(null)}
          />
        )}
        {brands.map(({ brand: name, count }) => (
          <ListRow
            key={name}
            title={name}
            detail={searchable(name) === chosen ? check : count}
            onClick={() => onChoose(name)}
          />
        ))}
      </GroupedSection>
      {brands.length === 0 && (
        <p className="mt-3 px-4 text-[15px] text-label-secondary">No brands found.</p>
      )}
    </>
  )
}
