import { useCurrentUser } from '../../app/currentUser'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { Sheet } from '../../components/ios/Sheet'
import { toUserMessage } from '../../lib/errors'
import type { Ingredient } from '../ingredients/ingredientsApi'
import { FindingCard } from './FindingCard'
import { useApplyFinding, useDecideFinding } from './hooks'
import type { Finding } from './reviewApi'

type ReviewSheetProps = {
  readonly open: boolean
  readonly findings: readonly Finding[]
  readonly ingredients: readonly Ingredient[]
  readonly onClose: () => void
  readonly onOpenIngredient: (ingredient: Ingredient) => void
  /** an applied fix changed this ingredient (recent meals follow it) */
  readonly onUpdated: (ingredient: Ingredient) => void
}

/** Ingredients › Review: what the weekly review found; nothing changes until applied here. */
export function ReviewSheet({
  open,
  findings,
  ingredients,
  onClose,
  onOpenIngredient,
  onUpdated,
}: ReviewSheetProps) {
  const { profile, householdId } = useCurrentUser()
  const apply = useApplyFinding(householdId, profile.id)
  const decide = useDecideFinding(householdId, profile.id)
  const byId = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]))
  // a finding whose ingredient was just deleted goes with it (the database removes it too)
  const shown = findings.flatMap((finding) => {
    const ingredient = byId.get(finding.ingredient_id)
    return ingredient ? [{ finding, ingredient }] : []
  })
  const error = apply.error ?? decide.error
  const busy = apply.isPending || decide.isPending

  return (
    <Sheet open={open} title="Review" onClose={onClose}>
      <div className="flex flex-col gap-3 pb-4">
        <p className="text-[14px] font-medium text-label-secondary">
          Suggestions from the weekly ingredient review. Nothing changes until you apply it.
        </p>
        {error && <ErrorBanner message={toUserMessage(error)} />}
        {shown.length === 0 && (
          <p className="mt-6 text-center text-[15px] text-label-secondary">
            Nothing left to review.
          </p>
        )}
        {shown.map(({ finding, ingredient }) => (
          <FindingCard
            key={finding.id}
            finding={finding}
            ingredient={ingredient}
            busy={busy}
            onApply={(patch) =>
              apply.mutate(
                { finding, patch },
                { onSuccess: (changed) => changed && onUpdated(changed) },
              )
            }
            onIgnore={() => decide.mutate({ finding, decision: 'ignored' })}
            onOpen={() => onOpenIngredient(ingredient)}
          />
        ))}
      </div>
    </Sheet>
  )
}
