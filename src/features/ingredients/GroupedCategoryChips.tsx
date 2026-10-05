import { useState } from 'react'
import { SLIM_CHIP_CLASSES, WRAPPED_ROW_CLASSES } from './CategoryChips'
import { FilterChip } from './FilterChip'
import { arrange, usePackedOrder } from './usePackedOrder'
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
// chip keys that can't clash with database ids (uuids)
const ALL_KEY = 'all'
const OTHER_KEY = 'other'
const WHOLE_GROUP_KEY = 'whole-group'

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

/** One chip of a packed row: its key, label, and what tapping it does. */
type ChipSpec = {
  readonly key: string
  readonly label: string
  readonly selected: boolean
  readonly expanded?: boolean
  readonly onClick: () => void
}

type PackedRowProps = {
  readonly label: string
  readonly chips: readonly ChipSpec[]
  readonly className: string
}

/** Wrapping chips, arranged to fill as few rows as possible (the first chip stays first). */
function PackedRow({ label, chips, className }: PackedRowProps) {
  const { ref, order } = usePackedOrder<HTMLDivElement>(chips.map((chip) => chip.key))
  return (
    <div ref={ref} role="group" aria-label={label} className={className}>
      {arrange(chips, (chip) => chip.key, order).map((chip) => (
        <FilterChip
          key={chip.key}
          chipKey={chip.key}
          selected={chip.selected}
          expanded={chip.expanded}
          onClick={chip.onClick}
          className={SLIM_CHIP_CLASSES}
        >
          {chip.label}
        </FilterChip>
      ))}
    </div>
  )
}

/** The categories of one broad category, opened below the broad chips. */
function GroupPanel({ group, filter, onChange }: PanelProps) {
  const chips: readonly ChipSpec[] = [
    {
      key: WHOLE_GROUP_KEY,
      label: `All ${group.name}`,
      selected: filter.kind === 'group' && filter.id === group.id,
      onClick: () => onChange({ kind: 'group', id: group.id }),
    },
    ...group.categories.map((category) => ({
      key: category.id,
      label: category.name,
      selected: filter.kind === 'category' && filter.id === category.id,
      onClick: () => onChange({ kind: 'category', id: category.id }),
    })),
  ]
  return (
    <PackedRow
      // a new broad category is measured afresh
      key={group.id ?? OTHER_KEY}
      label={`${group.name} categories`}
      chips={chips}
      className={`mt-2 animate-fade-in rounded-2xl bg-bg-elevated/60 p-2 ${WRAPPED_ROW_CLASSES}`}
    />
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

  const chips: readonly ChipSpec[] = [
    { key: ALL_KEY, label: 'All', selected: filter.kind === 'all', onClick: selectAll },
    ...groups.map((group) => ({
      key: group.id ?? OTHER_KEY,
      label: group.name,
      selected: selectedGroup === group,
      expanded: group.categories.length > 0 ? openGroup === group : undefined,
      onClick: () => toggleGroup(group),
    })),
  ]

  return (
    <div className="mt-3">
      <PackedRow label="Categories" chips={chips} className={WRAPPED_ROW_CLASSES} />
      {openGroup && <GroupPanel group={openGroup} filter={filter} onChange={onChange} />}
    </div>
  )
}
