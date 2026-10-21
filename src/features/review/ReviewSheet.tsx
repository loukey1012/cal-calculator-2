import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useCurrentUser } from '../../app/currentUser'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { Sheet } from '../../components/ios/Sheet'
import { toUserMessage } from '../../lib/errors'
import { usePeople } from '../household/hooks'
import { useLookOf } from '../household/usePersonLook'
import { useCategories, useIngredientUses } from '../ingredients/hooks'
import type { Ingredient } from '../ingredients/ingredientsApi'
import { FindingCard } from './FindingCard'
import { useApplyFinding, useDecideFinding, useMergeIngredients } from './hooks'
import { MealFindingCard } from './MealFindingCard'
import { duplicateOf } from './merge'
import { MergeView } from './MergeView'
import type { Finding } from './reviewApi'

/** History opens this person's day when navigated to with this state (see HistoryPage). */
export type OpenDayState = { readonly person: string }

type ReviewSheetProps = {
  readonly open: boolean
  readonly findings: readonly Finding[]
  readonly ingredients: readonly Ingredient[]
  readonly onClose: () => void
  readonly onOpenIngredient: (ingredient: Ingredient) => void
  /** an applied fix changed this ingredient (recent meals follow it) */
  readonly onUpdated: (ingredient: Ingredient) => void
}

function Section({ title, children }: { readonly title?: string; readonly children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      {title && <h2 className="caption mt-2 px-1">{title}</h2>}
      {children}
    </section>
  )
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
  const navigate = useNavigate()
  const people = usePeople(profile, householdId)
  const lookOf = useLookOf()
  const apply = useApplyFinding(householdId, profile.id)
  const decide = useDecideFinding(householdId, profile.id)
  const merge = useMergeIngredients(householdId)
  // the duplicate finding being compared, if any
  const [comparingId, setComparingId] = useState<string | null>(null)
  const categories = useCategories(householdId)
  const uses = useIngredientUses(householdId, comparingId !== null)
  const byId = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]))
  // a finding whose ingredient was just deleted goes with it (the database removes it too)
  const ingredientFindings = findings.flatMap((finding) => {
    const ingredient = finding.ingredient_id ? byId.get(finding.ingredient_id) : undefined
    const duplicate = byId.get(duplicateOf(finding.suggestion) ?? '')
    return ingredient ? [{ finding, ingredient, duplicate }] : []
  })
  const comparing = ingredientFindings.find(({ finding }) => finding.id === comparingId)
  const mealFindings = findings.flatMap((finding) => {
    const person = people.find(({ id }) => id === finding.user_id)
    return finding.ingredient_id === null && person ? [{ finding, person }] : []
  })
  const titled = ingredientFindings.length > 0 && mealFindings.length > 0
  const error = apply.error ?? decide.error ?? merge.error
  const busy = apply.isPending || decide.isPending || merge.isPending

  function openDay(finding: Finding) {
    if (!finding.user_id || !finding.date) return
    onClose()
    navigate(`/history/${finding.date}`, {
      state: { person: finding.user_id } satisfies OpenDayState,
    })
  }

  return (
    <Sheet open={open} title="Review" onClose={onClose}>
      {comparing?.duplicate ? (
        <>
          {error && <ErrorBanner message={toUserMessage(error)} />}
          <MergeView
            key={comparing.finding.id}
            pair={[comparing.ingredient, comparing.duplicate]}
            categories={categories.data ?? []}
            uses={uses.data ?? {}}
            busy={busy}
            onBack={() => setComparingId(null)}
            onMerge={(choice) =>
              merge.mutate(
                { finding: comparing.finding, ...choice },
                { onSuccess: () => setComparingId(null) },
              )
            }
            onIgnore={() => {
              setComparingId(null)
              decide.mutate({ finding: comparing.finding, decision: 'ignored' })
            }}
          />
        </>
      ) : (
        <div className="flex flex-col gap-3 pb-4">
          <p className="text-[14px] font-medium text-label-secondary">
            Suggestions from the weekly review. Nothing changes until you apply it.
          </p>
          {error && <ErrorBanner message={toUserMessage(error)} />}
          {ingredientFindings.length === 0 && mealFindings.length === 0 && (
            <p className="mt-6 text-center text-[15px] text-label-secondary">
              Nothing left to review.
            </p>
          )}
          {ingredientFindings.length > 0 && (
            <Section title={titled ? 'Ingredients' : undefined}>
              {ingredientFindings.map(({ finding, ingredient, duplicate }) => (
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
                  onCompare={
                    finding.kind === 'duplicate' && duplicate
                      ? () => setComparingId(finding.id)
                      : undefined
                  }
                />
              ))}
            </Section>
          )}
          {mealFindings.length > 0 && (
            <Section title={titled ? 'Meals' : undefined}>
              {mealFindings.map(({ finding, person }) => (
                <MealFindingCard
                  key={finding.id}
                  finding={finding}
                  personName={lookOf(person).name}
                  busy={busy}
                  onOpenDay={() => openDay(finding)}
                  onDone={() => decide.mutate({ finding, decision: 'applied' })}
                  onIgnore={() => decide.mutate({ finding, decision: 'ignored' })}
                />
              ))}
            </Section>
          )}
        </div>
      )}
    </Sheet>
  )
}
