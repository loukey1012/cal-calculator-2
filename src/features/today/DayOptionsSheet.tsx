import { GroupedSection } from '../../components/ios/GroupedSection'
import { ToggleRow } from '../../components/ios/FormRows'
import { Sheet } from '../../components/ios/Sheet'
import { TextField } from '../../components/ios/TextField'
import { cheatMeals, MEAL_TYPES } from '../meals/dayModel'
import {
  useDay,
  useCheatDay,
  useDayNote,
  useSetCheatMeal,
  useSetCheatDay,
  useSetDayNote,
  useSetMealNote,
} from '../meals/hooks'

// mirrors the database checks on day_notes.note and meals.note
const MAX_NOTE = 500

type DayOptionsSheetProps = {
  readonly open: boolean
  readonly userId: string
  /** local YYYY-MM-DD */
  readonly date: string
  readonly onClose: () => void
}

/**
 * The day's marks and notes: a cheat day, which meals were cheat meals, and a note on the day and
 * on each meal. A switch saves at once, a note when its field is left.
 */
export function DayOptionsSheet({ open, userId, date, onClose }: DayOptionsSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title="Day">
      <DayOptions userId={userId} date={date} />
    </Sheet>
  )
}

function DayOptions({ userId, date }: Pick<DayOptionsSheetProps, 'userId' | 'date'>) {
  const day = useDay(userId, date)
  const cheatDay = useCheatDay(userId, date)
  const setCheatDay = useSetCheatDay(userId, date)
  const setCheatMeal = useSetCheatMeal(userId, date)
  const dayNote = useDayNote(userId, date)
  const setDayNote = useSetDayNote(userId, date)
  const setMealNote = useSetMealNote(userId, date)
  const cheatMealTypes = cheatMeals(day.data ?? [])
  const mealNote = (type: string) => day.data?.find((meal) => meal.meal_type === type)?.note ?? null

  return (
    <>
      <GroupedSection footer="Left out of averages and the weekly review. The rings show no over colors.">
        <ToggleRow
          label="Cheat day"
          checked={cheatDay.data === true}
          onChange={(checked) => setCheatDay.mutate(checked)}
        />
      </GroupedSection>
      <GroupedSection
        header="Cheat meals"
        footer="A cheat meal leaves the whole day out of averages and the weekly review, like a cheat day."
      >
        {MEAL_TYPES.map(({ type, label }) => (
          <ToggleRow
            key={type}
            label={label}
            checked={cheatMealTypes.has(type)}
            onChange={(checked) => setCheatMeal.mutate({ mealType: type, cheatMeal: checked })}
          />
        ))}
      </GroupedSection>
      <GroupedSection header="Notes" footer="E.g. what happened that day or at that meal.">
        <NoteField label="Day" note={dayNote.data ?? null} onSave={setDayNote.mutate} />
        {MEAL_TYPES.map(({ type, label }) => (
          <NoteField
            key={type}
            label={label}
            note={mealNote(type)}
            onSave={(note) => setMealNote.mutate({ mealType: type, note })}
          />
        ))}
      </GroupedSection>
    </>
  )
}

type NoteFieldProps = {
  readonly label: string
  /** as saved; null = none */
  readonly note: string | null
  readonly onSave: (note: string) => void
}

/** A note saved when the field is left (or Return is tapped), only if it changed. */
function NoteField({ label, note, onSave }: NoteFieldProps) {
  return (
    <TextField
      // starts over from the saved note whenever that changes, e.g. after the partner's edit
      key={note ?? ''}
      label={label}
      aria-label={`${label} note`}
      defaultValue={note ?? ''}
      placeholder="Add a note"
      maxLength={MAX_NOTE}
      enterKeyHint="done"
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
      onBlur={(event) => {
        if (event.target.value.trim() !== (note ?? '')) onSave(event.target.value)
      }}
    />
  )
}
