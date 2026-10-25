import type { Profile } from '../household/householdApi'
import { PersonBadge } from '../household/PersonBadge'
import { useLookOf } from '../household/usePersonLook'
import { draftEaterIds, linesOnlyFor, withEater, type AddFoodDraft } from './addFoodDraft'

type WhoEatsProps = {
  readonly draft: AddFoodDraft
  readonly people: readonly Profile[]
  readonly onChange: (draft: AddFoodDraft) => void
}

/** Who eats (anyone in the household); the day and meal are the ones Add food was opened for. */
export function WhoEats({ draft, people, onChange }: WhoEatsProps) {
  const lookOf = useLookOf()
  const eaters = draftEaterIds(draft)

  function toggle(person: Profile) {
    const eating = eaters.includes(person.id)
    if (!eating) return onChange(withEater(draft, person.id, true))
    const name = lookOf(person).name
    const ownLines = linesOnlyFor(draft, person.id)
    if (
      ownLines.length > 0 &&
      !window.confirm(`Remove ${name}? Ingredients only ${name} has are removed too.`)
    ) {
      return
    }
    onChange(withEater(draft, person.id, false))
  }

  return (
    <>
      {people.length > 1 && (
        <section className="mt-4">
          <h2 className="caption px-4 pb-2">Who eats</h2>
          <div role="group" aria-label="Who eats" className="flex flex-wrap gap-2">
            {people.map((person) => {
              const look = lookOf(person)
              const eating = eaters.includes(person.id)
              return (
                <button
                  key={person.id}
                  type="button"
                  aria-label={look.name}
                  aria-pressed={eating}
                  // someone always eats
                  disabled={eating && eaters.length === 1}
                  onClick={() => toggle(person)}
                  className={`flex h-11 items-center gap-2 rounded-full pr-4 pl-1.5 text-[15px] transition-colors ${
                    eating
                      ? 'bg-bg-elevated font-bold text-label shadow-card'
                      : 'font-semibold text-label-secondary opacity-70'
                  }`}
                >
                  <PersonBadge look={look} />
                  {look.name}
                </button>
              )
            })}
          </div>
        </section>
      )}
    </>
  )
}
