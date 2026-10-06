import type { Profile } from './householdApi'
import { PersonBadge } from './PersonBadge'
import { useLookOf } from './usePersonLook'

type PersonSwitchProps = {
  readonly people: readonly Profile[]
  readonly selectedId: string
  readonly onChange: (personId: string) => void
}

/** Choose whose day to look at; hidden when you are alone in the household. */
export function PersonSwitch({ people, selectedId, onChange }: PersonSwitchProps) {
  const lookOf = useLookOf()
  if (people.length < 2) return null
  return (
    <div role="radiogroup" aria-label="Person" className="mt-3 flex flex-wrap gap-2">
      {people.map((member) => {
        const selected = member.id === selectedId
        const look = lookOf(member)
        return (
          <button
            key={member.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(member.id)}
            className={`flex h-11 items-center gap-2 rounded-full pr-4 pl-1.5 text-[15px] transition-colors ${
              selected
                ? 'bg-bg-elevated font-bold text-label shadow-card'
                : 'font-semibold text-label-secondary'
            }`}
          >
            <PersonBadge look={look} />
            {look.name}
          </button>
        )
      })}
    </div>
  )
}
