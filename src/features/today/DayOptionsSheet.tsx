import { useId, useState } from 'react'
import { Button } from '../../components/ios/Button'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { SegmentedControl } from '../../components/ios/SegmentedControl'
import { ToggleRow } from '../../components/ios/FormRows'
import { ClearButton } from '../../components/ios/ClearButton'
import { useClearable } from '../../components/ios/clearable'
import { Sheet } from '../../components/ios/Sheet'
import { cheatMeals, MEAL_TYPES, type MealType } from '../meals/dayModel'
import type { DayMark } from '../meals/mealsApi'
import {
  useDay,
  useDayMark,
  useDayNote,
  useSetCheatMeal,
  useSetDayMark,
  useSetDayNote,
  useSetMealNote,
} from '../meals/hooks'

// DayMark as strings, since a segment needs a value
type MarkChoice = 'none' | 'cheat' | 'alcohol'

const MARK_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'cheat', label: 'Cheat day' },
  { value: 'alcohol', label: 'Alcohol day' },
] as const satisfies readonly { value: MarkChoice; label: string }[]

const markOf = (choice: MarkChoice): DayMark => (choice === 'none' ? null : choice)

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
 * What was edited in the sheet and not saved yet. A part that is missing follows the loaded data, so a change
 * made by the partner meanwhile still shows.
 */
type Draft = {
  readonly mark?: MarkChoice
  readonly cheatMeals: Readonly<Partial<Record<MealType, boolean>>>
  readonly dayNote?: string
  readonly mealNotes: Readonly<Partial<Record<MealType, string>>>
}

const EMPTY_DRAFT: Draft = { cheatMeals: {}, mealNotes: {} }

const DISCARD_QUESTION = 'Discard changes?'

/**
 * An edit, or none once it is back at the saved value: an untouched part follows the data, so a
 * change from the partner meanwhile shows and is never overwritten by a Save.
 */
function editOf<T>(value: T, saved: T): T | undefined {
  return value === saved ? undefined : value
}

function withEdit<T>(
  edits: Readonly<Partial<Record<MealType, T>>>,
  type: MealType,
  value: T,
  saved: T,
): Partial<Record<MealType, T>> {
  const { [type]: _previous, ...others } = edits
  const edit = editOf(value, saved)
  return edit === undefined ? others : { ...others, [type]: edit }
}

/**
 * The day's marks and notes: a cheat day or an alcohol day, which meals were cheat meals, and a note on the day and
 * on each meal. Nothing is kept until Save; closing the sheet with edits asks first.
 */
export function DayOptionsSheet({ open, ...rest }: DayOptionsSheetProps) {
  // mounted only while open, so every opening starts without edits
  return open ? <DayOptionsPanel {...rest} /> : null
}

function DayOptionsPanel({ userId, date, onClose }: Omit<DayOptionsSheetProps, 'open'>) {
  const day = useDay(userId, date)
  const dayMark = useDayMark(userId, date)
  const dayNote = useDayNote(userId, date)
  const markHelpId = useId()
  const setDayMark = useSetDayMark(userId, date)
  const setCheatMeal = useSetCheatMeal(userId, date)
  const setDayNote = useSetDayNote(userId, date)
  const setMealNote = useSetMealNote(userId, date)
  const [draft, setDraft] = useState(EMPTY_DRAFT)

  const savedMark: MarkChoice = dayMark.data ?? 'none'
  const savedCheatMeals = cheatMeals(day.data ?? [])
  const savedDayNote = dayNote.data ?? ''
  const savedMealNote = (type: MealType) =>
    day.data?.find((meal) => meal.meal_type === type)?.note ?? ''

  // only what differs from what is saved
  const markChanged = draft.mark !== undefined && draft.mark !== savedMark
  const changedCheatMeals = MEAL_TYPES.filter(
    ({ type }) =>
      draft.cheatMeals[type] !== undefined && draft.cheatMeals[type] !== savedCheatMeals.has(type),
  )
  const dayNoteChanged = draft.dayNote !== undefined && draft.dayNote.trim() !== savedDayNote
  const changedMealNotes = MEAL_TYPES.filter(
    ({ type }) =>
      draft.mealNotes[type] !== undefined && draft.mealNotes[type].trim() !== savedMealNote(type),
  )
  const hasChanges =
    markChanged || dayNoteChanged || changedCheatMeals.length > 0 || changedMealNotes.length > 0
  // until the day is known, a save could overwrite or clear what is there
  const loaded = dayMark.data !== undefined && day.data !== undefined && dayNote.data !== undefined

  function close() {
    if (hasChanges && !window.confirm(DISCARD_QUESTION)) return
    onClose()
  }

  function save() {
    if (markChanged && draft.mark !== undefined) setDayMark.mutate(markOf(draft.mark))
    for (const { type } of changedCheatMeals) {
      setCheatMeal.mutate({ mealType: type, cheatMeal: draft.cheatMeals[type] === true })
    }
    if (dayNoteChanged && draft.dayNote !== undefined) setDayNote.mutate(draft.dayNote)
    for (const { type } of changedMealNotes) {
      setMealNote.mutate({ mealType: type, note: draft.mealNotes[type] ?? '' })
    }
    // the edits are in the mutations now (optimistic, queued offline); what shows follows the data again
    setDraft(EMPTY_DRAFT)
    onClose()
  }

  return (
    <Sheet
      open
      onClose={close}
      title="Day"
      action={
        <Button
          variant="plain"
          disabled={!hasChanges || !loaded}
          onClick={save}
          className="-mr-2 font-semibold"
        >
          Save
        </Button>
      }
    >
      <GroupedSection
        footerId={markHelpId}
        footer="A cheat day is off plan. On an alcohol day the calories are not known. Either is left out of averages and the weekly review, and the rings show no over colors."
      >
        <div className="p-3">
          <SegmentedControl
            label="Day mark"
            options={MARK_OPTIONS}
            value={draft.mark ?? savedMark}
            // until the day's mark is known, a tap could overwrite or clear it
            disabled={dayMark.data === undefined}
            describedBy={markHelpId}
            onChange={(mark) =>
              setDraft((current) => ({ ...current, mark: editOf(mark, savedMark) }))
            }
          />
        </div>
      </GroupedSection>
      <GroupedSection
        header="Cheat meals"
        footer="A cheat meal leaves the whole day out of averages and the weekly review, like a cheat day."
      >
        {MEAL_TYPES.map(({ type, label }) => (
          <ToggleRow
            key={type}
            label={label}
            checked={draft.cheatMeals[type] ?? savedCheatMeals.has(type)}
            onChange={(checked) =>
              setDraft((current) => ({
                ...current,
                cheatMeals: withEdit(current.cheatMeals, type, checked, savedCheatMeals.has(type)),
              }))
            }
          />
        ))}
      </GroupedSection>
      <GroupedSection
        header="Notes"
        footer="E.g. what happened that day or at that meal. Save keeps the changes."
      >
        <NoteField
          label="Day"
          value={draft.dayNote ?? savedDayNote}
          disabled={!loaded}
          onChange={(note) =>
            setDraft((current) => ({ ...current, dayNote: editOf(note, savedDayNote) }))
          }
        />
        {MEAL_TYPES.map(({ type, label }) => (
          <NoteField
            key={type}
            label={label}
            value={draft.mealNotes[type] ?? savedMealNote(type)}
            disabled={!loaded}
            onChange={(note) =>
              setDraft((current) => ({
                ...current,
                mealNotes: withEdit(current.mealNotes, type, note, savedMealNote(type)),
              }))
            }
          />
        ))}
      </GroupedSection>
    </Sheet>
  )
}

type NoteFieldProps = {
  readonly label: string
  readonly value: string
  readonly disabled: boolean
  readonly onChange: (note: string) => void
}

/** A note row, its name on the left. Emptied, the note goes once the sheet is saved. */
function NoteField({ label, value, disabled, onChange }: NoteFieldProps) {
  const id = useId()
  const {
    ref: clearRef,
    hasValue: hasText,
    onChange: onTextChange,
    clear,
  } = useClearable({ value })
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <label htmlFor={id} className="w-24 shrink-0 text-[17px]">
        {label}
      </label>
      <input
        id={id}
        aria-label={`${label} note`}
        value={value}
        disabled={disabled}
        placeholder="Add a note"
        maxLength={MAX_NOTE}
        enterKeyHint="done"
        className="min-w-0 flex-1 bg-transparent text-[17px] text-label outline-none placeholder:text-label-secondary/60"
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
        }}
        ref={clearRef}
        onChange={(event) => {
          onTextChange(event)
          onChange(event.target.value)
        }}
      />
      {hasText && <ClearButton onClick={clear} />}
    </div>
  )
}
