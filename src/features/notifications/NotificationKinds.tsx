import { useEffect, useRef } from 'react'
import { useCurrentUser } from '../../app/currentUser'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { InputRow, ToggleRow } from '../../components/ios/FormRows'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { SegmentedControl } from '../../components/ios/SegmentedControl'
import { toUserMessage } from '../../lib/errors'
import {
  REMINDER_MEALS,
  UNSAVED_DISH_MINUTES,
  type NotificationSettings,
  type ReminderMeal,
  type SummaryDay,
  type TimedSwitch,
} from '../../../supabase/functions/_shared/notificationSettings.ts'
import { usePreferences, useSavePreferences } from './hooks'
import { deviceTimeZone, type Preferences } from './preferencesApi'

const MEAL_LABELS: Readonly<Record<ReminderMeal, string>> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
}

const SUMMARY_DAY_OPTIONS: ReadonlyArray<{ readonly value: SummaryDay; readonly label: string }> = [
  { value: 'previous', label: 'Next morning' },
  { value: 'same', label: 'Same day' },
]

const UNSAVED_OPTIONS = UNSAVED_DISH_MINUTES.map((minutes) => ({
  value: String(minutes),
  label: minutes < 60 ? `${minutes} min` : `${minutes / 60} h`,
}))

const TIME_INPUT_CLASS = 'w-28 bg-transparent text-right text-[17px] text-label outline-none'

type TimeRowProps = {
  readonly label: string
  readonly value: TimedSwitch
  readonly onChange: (value: TimedSwitch) => void
}

/** A switch, and its time while it's on. */
function TimedRows({ label, value, onChange }: TimeRowProps) {
  return (
    <>
      <ToggleRow label={label} checked={value.on} onChange={(on) => onChange({ ...value, on })} />
      {value.on && (
        <InputRow
          label="Time"
          accessibleLabel={`${label} time`}
          indent
          type="time"
          value={value.time}
          // a cleared field keeps the time as it was
          onChange={(event) =>
            event.target.value && onChange({ ...value, time: event.target.value })
          }
          className={TIME_INPUT_CLASS}
        />
      )}
    </>
  )
}

/** What I'm notified about and when; saved to my account, so every phone of mine follows. */
export function NotificationKinds() {
  const { profile } = useCurrentUser()
  const preferences = usePreferences(profile.id)
  const save = useSavePreferences(profile.id)
  const loaded = preferences.data
  const timeZone = deviceTimeZone()

  // the times follow the clock of the phone used last; tried once per visit (not again and
  // again while offline)
  const triedTimeZone = useRef(false)
  useEffect(() => {
    if (triedTimeZone.current || !loaded || !timeZone || loaded.timeZone === timeZone) return
    triedTimeZone.current = true
    save.mutate({ ...loaded, timeZone })
  }, [loaded, timeZone, save])

  if (preferences.isError) return <ErrorBanner message={toUserMessage(preferences.error)} />
  if (!loaded) return null

  const change = (settings: NotificationSettings) => {
    const next: Preferences = { settings, timeZone: timeZone ?? loaded.timeZone }
    save.mutate(next)
  }
  const { settings } = loaded

  return (
    <>
      <GroupedSection header="Your partner">
        <ToggleRow
          label="Changes to your meals"
          checked={settings.partnerChanges}
          onChange={(partnerChanges) => change({ ...settings, partnerChanges })}
        />
      </GroupedSection>
      <GroupedSection
        header="Meal reminders"
        footer="Only when nothing is logged for that meal by then."
      >
        {REMINDER_MEALS.map((meal) => (
          <TimedRows
            key={meal}
            label={MEAL_LABELS[meal]}
            value={settings.reminders[meal]}
            onChange={(reminder) =>
              change({ ...settings, reminders: { ...settings.reminders, [meal]: reminder } })
            }
          />
        ))}
      </GroupedSection>
      <GroupedSection
        header="Day summary"
        footer={
          settings.summary.day === 'previous'
            ? 'About the day before, so late snacks count.'
            : 'About the same day, at the time you choose.'
        }
      >
        <TimedRows
          label="Day summary"
          value={settings.summary}
          onChange={(summary) =>
            change({ ...settings, summary: { ...settings.summary, ...summary } })
          }
        />
      </GroupedSection>
      {settings.summary.on && (
        <div className="mt-3">
          <SegmentedControl
            label="Summary day"
            options={SUMMARY_DAY_OPTIONS}
            value={settings.summary.day}
            onChange={(day) => change({ ...settings, summary: { ...settings.summary, day } })}
          />
        </div>
      )}
      <GroupedSection header="Cook" footer="When a dish waits on Cook without being logged.">
        <ToggleRow
          label="Dish not logged yet"
          checked={settings.unsavedDish.on}
          onChange={(on) => change({ ...settings, unsavedDish: { ...settings.unsavedDish, on } })}
        />
      </GroupedSection>
      {settings.unsavedDish.on && (
        <div className="mt-3">
          <SegmentedControl
            label="Unsaved dish after"
            options={UNSAVED_OPTIONS}
            value={String(settings.unsavedDish.afterMinutes)}
            onChange={(minutes) =>
              change({
                ...settings,
                unsavedDish: { ...settings.unsavedDish, afterMinutes: Number(minutes) },
              })
            }
          />
        </div>
      )}
      <GroupedSection header="Ingredients">
        <ToggleRow
          label="Weekly review found something"
          checked={settings.weeklyReview}
          onChange={(weeklyReview) => change({ ...settings, weeklyReview })}
        />
      </GroupedSection>
      {save.error && <ErrorBanner message={toUserMessage(save.error)} />}
    </>
  )
}
