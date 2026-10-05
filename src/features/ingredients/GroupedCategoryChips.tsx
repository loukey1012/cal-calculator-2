import { useState } from 'react'
import { SLIM_CHIP_CLASSES, WRAPPED_ROW_CLASSES } from './CategoryChips'
import { FilterChip } from './FilterChip'
import { ALL_CATEGORIES, type CategoryFilter, type ChipGroup } from './listing'

type GroupedCategoryChipsProps = {
  readonly groups: readonly ChipGroup[]
  readonly filter: CategoryFilter
  readonly onChange: (filter: CategoryFilter) => void
  /** broad category whose panel starts open (the Appearance preview); undefined = none */
  readonly initialOpenId?: string | null
}

// "no panel open"; null can't mean that, it is the id of "Other"
const CLOSED = undefined

function groupOfFilter(groups: readonly ChipGroup[], filter: CategoryFilter) {
  if (filter.kind === 'group') return groups.find((group) => group.id === filter.id)
  if (filter.kind === 'category')
    return groups.find((group) => group.categories.some((category) => category.id === filter.id))
  return undefined
}

type PanelProps = {
  readonly group: ChipGroup
  readonly filter: CategoryFilter
  readonly onChange: (filter: CategoryFilter) => void
}

/** The categories of one broad category, opened below the broad chips. */
function GroupPanel({ group, filter, onChange }: PanelProps) {
  const wholeGroup: CategoryFilter = { kind: 'group', id: group.id }
  return (
    <div
      role="group"
      aria-label={`${group.name} categories`}
      className={`mt-2 animate-fade-in rounded-2xl bg-bg-elevated/60 p-2 ${WRAPPED_ROW_CLASSES}`}
    >
      <FilterChip
        selected={filter.kind === 'group' && filter.id === group.id}
        onClick={() => onChange(wholeGroup)}
        className={SLIM_CHIP_CLASSES}
      >
        All {group.name}
      </FilterChip>
      {group.categories.map((category) => (
        <FilterChip
          key={category.id}
          selected={filter.kind === 'category' && filter.id === category.id}
          onClick={() => onChange({ kind: 'category', id: category.id })}
          className={SLIM_CHIP_CLASSES}
        >
          {category.name}
        </FilterChip>
      ))}
    </div>
  )
}

/** Broad categories as chips; tapping one filters by it and opens its categories below. */
export function GroupedCategoryChips({
  groups,
  filter,
  onChange,
  initialOpenId = CLOSED,
}: GroupedCategoryChipsProps) {
  const [openId, setOpenId] = useState<string | null | undefined>(initialOpenId)
  const selectedGroup = groupOfFilter(groups, filter)
  const openGroup = groups.find((group) => group.id === openId && group.categories.length > 0)

  function selectAll() {
    setOpenId(CLOSED)
    onChange(ALL_CATEGORIES)
  }

  function toggleGroup(group: ChipGroup) {
    if (openGroup === group) {
      setOpenId(CLOSED)
      return
    }
    setOpenId(group.id)
    onChange({ kind: 'group', id: group.id })
  }

  return (
    <div className="mt-3">
      <div role="group" aria-label="Categories" className={WRAPPED_ROW_CLASSES}>
        <FilterChip
          selected={filter.kind === 'all'}
          onClick={selectAll}
          className={SLIM_CHIP_CLASSES}
        >
          All
        </FilterChip>
        {groups.map((group) => (
          <FilterChip
            key={group.id ?? 'other'}
            selected={selectedGroup === group}
            expanded={group.categories.length > 0 ? openGroup === group : undefined}
            onClick={() => toggleGroup(group)}
            className={SLIM_CHIP_CLASSES}
          >
            {group.name}
          </FilterChip>
        ))}
      </div>
      {openGroup && <GroupPanel group={openGroup} filter={filter} onChange={onChange} />}
    </div>
  )
}
