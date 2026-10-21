import { InputRow } from '../../components/ios/FormRows'
import { GroupedSection } from '../../components/ios/GroupedSection'
import type { Profile } from '../household/householdApi'
import { PersonBadge } from '../household/PersonBadge'
import { useLookOf } from '../household/usePersonLook'
import { draftEaterIds, linesOnlyFor, withDate, withEater, type CookDraft } from './cookDraft'

type CookWhoWhenProps = {
  readonly draft: CookDraft
  readonly people: readonly Profile[]
  /** local YYYY-MM-DD */
  readonly today: string
  readonly onChange: (draft: CookDraft) => void
}

/** Who eats (anyone in the household) and on which day; the meal is the one it was opened for. */
export function CookWhoWhen({ draft, people, today, onChange }: CookWhoWhenProps) {
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
      <GroupedSection header="When">
        <InputRow
          label="Day"
          type="date"
          max={today}
          value={draft.date ?? today}
          onChange={(event) => {
            const day = event.target.value
            // cleared or in the future: keep the day as it was
            if (day && day <= today) onChange(withDate(draft, day, today))
          }}
          className="w-40 bg-transparent text-right text-[17px] text-label outline-none"
        />
      </GroupedSection>
    </>
  )
}
