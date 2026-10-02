import { SegmentedControl } from '../../components/ios/SegmentedControl'
import { displayName } from './hooks'
import type { Profile } from './householdApi'

type PersonSwitchProps = {
  readonly people: readonly Profile[]
  readonly selectedId: string
  readonly onChange: (personId: string) => void
}

/** Choose whose day to look at; hidden when you are alone in the household. */
export function PersonSwitch({ people, selectedId, onChange }: PersonSwitchProps) {
  if (people.length < 2) return null
  return (
    <div className="mt-2">
      <SegmentedControl
        label="Person"
        options={people.map((member) => ({ value: member.id, label: displayName(member) }))}
        value={selectedId}
        onChange={onChange}
      />
    </div>
  )
}
