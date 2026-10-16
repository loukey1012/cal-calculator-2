import { Button } from '../../components/ios/Button'
import type { Ingredient } from '../ingredients/ingredientsApi'
import { FINDING_KIND_LABELS } from './kinds'
import type { Finding } from './reviewApi'
import { describeChanges, suggestionPatch, type IngredientPatch } from './suggestion'

type FindingCardProps = {
  readonly finding: Finding
  readonly ingredient: Ingredient
  readonly busy: boolean
  /** with the fix to apply; an empty fix only marks the finding done */
  readonly onApply: (patch: IngredientPatch) => void
  readonly onIgnore: () => void
  readonly onOpen: () => void
}

/** An ingredient finding: the ingredient, why it was flagged, the suggested change, the decision. */
export function FindingCard({
  finding,
  ingredient,
  busy,
  onApply,
  onIgnore,
  onOpen,
}: FindingCardProps) {
  const name = ingredient.brand ? `${ingredient.name} · ${ingredient.brand}` : ingredient.name
  const patch = suggestionPatch(finding.suggestion) ?? {}
  const changes = describeChanges(ingredient, patch)

  return (
    <article aria-label={name} className="glass-surface rounded-3xl bg-bg-elevated p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          aria-label={`Open ${ingredient.name}`}
          onClick={onOpen}
          className="min-w-0 text-left text-[17px] font-bold text-accent-ink"
        >
          {name}
        </button>
        <span className="shrink-0 rounded-full bg-fill px-2.5 py-0.5 text-[13px] font-semibold text-label-secondary">
          {FINDING_KIND_LABELS[finding.kind]}
        </span>
      </div>
      <p className="mt-1 text-[15px] text-label">{finding.message}</p>
      {changes.length > 0 && (
        <dl className="mt-3 flex flex-col gap-1 text-[15px]">
          {changes.map(({ label, from, to }) => (
            <div key={label} className="flex justify-between gap-3">
              <dt className="text-label-secondary">{label}</dt>
              <dd className="text-right font-semibold">
                {from} → {to}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="plain" disabled={busy} onClick={onIgnore}>
          Ignore
        </Button>
        <Button
          variant="plain"
          disabled={busy}
          onClick={() => onApply(changes.length > 0 ? patch : {})}
        >
          {changes.length > 0 ? 'Apply fix' : 'Done'}
        </Button>
      </div>
    </article>
  )
}
