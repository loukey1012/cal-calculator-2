import { useState } from 'react'
import { Button } from '../../components/ios/Button'
import { ChevronLeftIcon } from '../../components/ios/icons'
import { useFocusOnMount } from '../../components/ios/useFocusOnMount'
import type { Category, Ingredient } from '../ingredients/ingredientsApi'
import { mergeRows, takenValues, type MergeField } from './merge'
import type { IngredientPatch } from './suggestion'

type MergeChoice = {
  readonly keepId: string
  readonly dropId: string
  readonly patch: IngredientPatch
}

type MergeViewProps = {
  /** the finding's ingredient and the one it duplicates */
  readonly pair: readonly [Ingredient, Ingredient]
  readonly categories: readonly Category[]
  /** how often each ingredient was used, by id (empty while loading) */
  readonly uses: Readonly<Record<string, number>>
  readonly busy: boolean
  readonly onBack: () => void
  readonly onMerge: (choice: MergeChoice) => void
  /** left out where there is no finding to ignore */
  readonly onIgnore?: () => void
  readonly backLabel?: string
}

const GRID = 'grid grid-cols-[6.5rem_minmax(0,1fr)_minmax(0,1fr)] items-start gap-2 px-3 py-2.5'

function brandAndUses(ingredient: Ingredient, uses: Readonly<Record<string, number>>) {
  return [ingredient.brand, `used ${uses[ingredient.id] ?? 0}×`].filter(Boolean).join(' · ')
}

/**
 * A duplicate finding, compared: pick the one to keep, take single values over from the other,
 * then merge (everything logged with the other one moves to the kept one).
 */
export function MergeView({
  pair,
  categories,
  uses,
  busy,
  onBack,
  onMerge,
  onIgnore,
  backLabel = 'Review',
}: MergeViewProps) {
  const heading = useFocusOnMount<HTMLHeadingElement>()
  // null = not picked yet: the one used more often (the counts may still be loading)
  const [keepId, setKeepId] = useState<string | null>(null)
  const [taken, setTaken] = useState<ReadonlySet<MergeField>>(new Set())
  const moreUsed = (uses[pair[1].id] ?? 0) > (uses[pair[0].id] ?? 0) ? pair[1] : pair[0]
  const keep = pair.find((ingredient) => ingredient.id === keepId) ?? moreUsed
  const other = pair.find((ingredient) => ingredient !== keep) ?? pair[1]
  const rows = mergeRows(keep, other, categories)

  function pickKeep(id: string) {
    setKeepId(id)
    setTaken(new Set())
  }

  function toggle(field: MergeField) {
    setTaken((current) => {
      const next = new Set(current)
      if (!next.delete(field)) next.add(field)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-3 pb-4">
      <Button
        variant="plain"
        className="-ml-2 flex items-center gap-0.5 self-start"
        onClick={onBack}
      >
        <ChevronLeftIcon className="h-5 w-5" />
        {backLabel}
      </Button>
      <h2 ref={heading} tabIndex={-1} className="font-display text-[22px] font-bold outline-none">
        Merge duplicates
      </h2>
      <p className="text-[14px] font-medium text-label-secondary">
        Pick the one to keep. Tap a value of the other one to take it over. Everything logged with
        the other one moves to the kept one; past meals keep their calories.
      </p>
      <div role="group" aria-label="Which one to keep" className="grid grid-cols-2 gap-2">
        {pair.map((ingredient) => {
          const kept = ingredient === keep
          return (
            <button
              key={ingredient.id}
              type="button"
              aria-pressed={kept}
              aria-label={`Keep ${ingredient.name}, ${brandAndUses(ingredient, uses)}`}
              onClick={() => pickKeep(ingredient.id)}
              className={`glass-surface flex min-w-0 flex-col gap-0.5 rounded-[18px] bg-bg-elevated p-3 text-left shadow-card ${
                kept ? 'ring-2 ring-accent' : ''
              }`}
            >
              <span
                className={`text-[12px] font-extrabold ${kept ? 'text-accent-ink' : 'text-label-secondary'}`}
              >
                {kept ? 'KEEP' : 'MERGE IN'}
              </span>
              <span className="text-[15px] font-extrabold [overflow-wrap:anywhere]">
                {ingredient.name}
              </span>
              <span className="text-[13px] font-semibold text-label-secondary [overflow-wrap:anywhere]">
                {brandAndUses(ingredient, uses)}
              </span>
            </button>
          )
        })}
      </div>
      <div className="glass-surface overflow-hidden rounded-[20px] bg-bg-elevated text-[14px] font-semibold shadow-card">
        <div
          className={`${GRID} border-b border-separator text-[13px] font-bold text-label-secondary`}
        >
          <span />
          <span className="text-label [overflow-wrap:anywhere]">{keep.name}</span>
          <span className="text-label [overflow-wrap:anywhere]">{other.name}</span>
        </div>
        {rows.map(({ field, label, keep: kept, other: theirs, differs }) => {
          const isTaken = taken.has(field)
          return (
            <div
              key={field}
              className={`${GRID} border-b border-separator last:border-b-0 ${differs ? 'bg-fill' : ''}`}
            >
              <span className="text-label-secondary">{label}</span>
              <span
                className={`[overflow-wrap:anywhere] ${isTaken ? 'text-label-secondary line-through' : 'font-bold'}`}
              >
                {kept}
              </span>
              {differs ? (
                <button
                  type="button"
                  aria-pressed={isTaken}
                  aria-label={`Take ${label} from ${other.name}: ${theirs}`}
                  onClick={() => toggle(field)}
                  className={`min-w-0 text-left text-accent-ink [overflow-wrap:anywhere] ${isTaken ? 'font-extrabold' : ''}`}
                >
                  {isTaken ? `${theirs} ✓` : theirs}
                </button>
              ) : (
                <span className="[overflow-wrap:anywhere]">{theirs}</span>
              )}
            </div>
          )
        })}
      </div>
      <p className="px-1 text-[12px] font-semibold text-label-secondary">
        Highlighted rows differ.
      </p>
      <Button
        loading={busy}
        onClick={() =>
          onMerge({ keepId: keep.id, dropId: other.id, patch: takenValues(other, taken) })
        }
      >
        Merge into {keep.name}
      </Button>
      {onIgnore && (
        <Button variant="secondary" disabled={busy} onClick={onIgnore}>
          Not duplicates: ignore
        </Button>
      )}
    </div>
  )
}
