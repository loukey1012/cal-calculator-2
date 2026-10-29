import { useId, useState } from 'react'
import { Button } from '../../components/ios/Button'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { SegmentedControl } from '../../components/ios/SegmentedControl'
import { ToggleRow } from '../../components/ios/FormRows'
import { Sheet } from '../../components/ios/Sheet'
import { useGymDay, useSetGymDay, useSetSexDay, useSexDay } from '../dayMarks/hooks'
import { cheatMeals, MEAL_TYPES, type MealType } from '../meals/dayModel'
import type { DayMark } from '../meals/mealsApi'
import { useDay, useDayMark, useSetCheatMeal, useSetDayMark } from '../meals/hooks'

// DayMark as strings, since a segment needs a value
type MarkChoice = 'none' | 'cheat' | 'alcohol'

const MARK_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'cheat', label: 'Cheat day' },
  { value: 'alcohol', label: 'Alcohol day' },
] as const satisfies readonly { value: MarkChoice; label: string }[]

const markOf = (choice: MarkChoice): DayMark => (choice === 'none' ? null : choice)

type DayOptionsSheetProps = {
  readonly open: boolean
  readonly userId: string
  /** the household the sex mark belongs to */
  readonly householdId: string | null
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
  readonly gym?: boolean
  readonly sex?: boolean
  readonly cheatMeals: Readonly<Partial<Record<MealType, boolean>>>
}

const EMPTY_DRAFT: Draft = { cheatMeals: {} }

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
 * The day's marks: a cheat day or an alcohol day, and which meals were cheat meals (notes have
 * their own page). Nothing is kept until Save; closing the sheet with edits asks first.
 */
export function DayOptionsSheet({ open, ...rest }: DayOptionsSheetProps) {
  // mounted only while open, so every opening starts without edits
  return open ? <DayOptionsPanel {...rest} /> : null
}

function DayOptionsPanel({
  userId,
  householdId,
  date,
  onClose,
}: Omit<DayOptionsSheetProps, 'open'>) {
  const day = useDay(userId, date)
  const dayMark = useDayMark(userId, date)
  const markHelpId = useId()
  const setDayMark = useSetDayMark(userId, date)
  const setCheatMeal = useSetCheatMeal(userId, date)
  const gymDay = useGymDay(userId, date)
  const sexDay = useSexDay(householdId, date)
  const setGymDay = useSetGymDay(userId, date)
  const setSexDay = useSetSexDay(householdId, date, userId)
  const marksHelpId = useId()
  const [draft, setDraft] = useState(EMPTY_DRAFT)

  const savedMark: MarkChoice = dayMark.data ?? 'none'
  const savedCheatMeals = cheatMeals(day.data ?? [])
  const savedGym = gymDay.data ?? false
  const savedSex = sexDay.data ?? false

  // only what differs from what is saved
  const markChanged = draft.mark !== undefined && draft.mark !== savedMark
  const changedCheatMeals = MEAL_TYPES.filter(
    ({ type }) =>
      draft.cheatMeals[type] !== undefined && draft.cheatMeals[type] !== savedCheatMeals.has(type),
  )
  const gymChanged = draft.gym !== undefined && draft.gym !== savedGym
  const sexChanged = draft.sex !== undefined && draft.sex !== savedSex
  const hasChanges = markChanged || changedCheatMeals.length > 0 || gymChanged || sexChanged
  // each control stays off until its own data is known (a tap could overwrite or clear what is
  // there), so an edit exists only for what has loaded and Save needs nothing more
  const gymLoaded = gymDay.data !== undefined
  const sexLoaded = sexDay.data !== undefined
  const dayErrors = [dayMark.error, day.error].filter((error) => error !== null)

  function close() {
    if (hasChanges && !window.confirm(DISCARD_QUESTION)) return
    onClose()
  }

  function save() {
    if (markChanged && draft.mark !== undefined) setDayMark.mutate(markOf(draft.mark))
    for (const { type } of changedCheatMeals) {
      setCheatMeal.mutate({ mealType: type, cheatMeal: draft.cheatMeals[type] === true })
    }
    if (gymChanged && draft.gym !== undefined) setGymDay.mutate(draft.gym)
    if (sexChanged && draft.sex !== undefined) setSexDay?.mutate(draft.sex)
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
          disabled={!hasChanges}
          onClick={save}
          className="-mr-2 font-semibold"
        >
          Save
        </Button>
      }
    >
      {dayErrors.map((error) => (
        <p key={error.message} role="alert" className="px-4 pb-2 text-[13px] text-destructive">
          {error.message}
        </p>
      ))}
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
            disabled={day.data === undefined}
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
        header="Marks"
        footerId={marksHelpId}
        footer="Gym is per person. Sex shows on both calendars. Neither changes any figure."
      >
        <ToggleRow
          label="Gym"
          disabled={!gymLoaded}
          error={gymDay.error?.message}
          checked={draft.gym ?? savedGym}
          onChange={(gym) => setDraft((current) => ({ ...current, gym: editOf(gym, savedGym) }))}
        />
        {householdId !== null && (
          <ToggleRow
            label="Sex"
            disabled={!sexLoaded}
            error={sexDay.error?.message}
            checked={draft.sex ?? savedSex}
            onChange={(sex) => setDraft((current) => ({ ...current, sex: editOf(sex, savedSex) }))}
          />
        )}
      </GroupedSection>
    </Sheet>
  )
}
