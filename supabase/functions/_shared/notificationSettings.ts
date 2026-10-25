/**
 * What each person wants to be notified about, saved in profiles.notification_settings (JSON).
 * Shared by the app (Settings › Notifications) and the push-tick Edge Function: plain
 * TypeScript without dependencies. Anything missing or invalid falls back to the default.
 */

export type ReminderMeal = 'breakfast' | 'lunch' | 'dinner'
export const REMINDER_MEALS: readonly ReminderMeal[] = ['breakfast', 'lunch', 'dinner']

export type TimedSwitch = { readonly on: boolean; /** local HH:MM */ readonly time: string }

/** previous: the next morning, about the day before (evening snacks count); same: that evening */
export type SummaryDay = 'previous' | 'same'

export type NotificationSettings = {
  /** the partner logs, changes or deletes food in my meals, or shares a dish with me */
  readonly partnerChanges: boolean
  /** a meal still empty at its time */
  readonly reminders: Readonly<Record<ReminderMeal, TimedSwitch>>
  readonly summary: TimedSwitch & { readonly day: SummaryDay }
  /** a dish left in Add food without being logged */
  readonly unsavedDish: { readonly on: boolean; readonly afterMinutes: number }
  /** the weekly review found something new */
  readonly weeklyReview: boolean
}

export const DEFAULT_SETTINGS: NotificationSettings = {
  partnerChanges: true,
  reminders: {
    breakfast: { on: true, time: '10:00' },
    lunch: { on: true, time: '14:00' },
    dinner: { on: true, time: '20:00' },
  },
  summary: { on: true, day: 'previous', time: '08:00' },
  unsavedDish: { on: true, afterMinutes: 30 },
  weeklyReview: true,
}

export const UNSAVED_DISH_MINUTES = [15, 30, 60, 120] as const

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

type Raw = Record<string, unknown>

const objectOf = (value: unknown): Raw =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Raw) : {}

const booleanOr = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback

const timeOr = (value: unknown, fallback: string): string =>
  typeof value === 'string' && TIME_PATTERN.test(value) ? value : fallback

function timedSwitch(value: unknown, fallback: TimedSwitch): TimedSwitch {
  const raw = objectOf(value)
  return { on: booleanOr(raw.on, fallback.on), time: timeOr(raw.time, fallback.time) }
}

export function parseNotificationSettings(value: unknown): NotificationSettings {
  const raw = objectOf(value)
  const reminders = objectOf(raw.reminders)
  const summary = objectOf(raw.summary)
  const unsavedDish = objectOf(raw.unsavedDish)
  const minutes = unsavedDish.afterMinutes
  return {
    partnerChanges: booleanOr(raw.partnerChanges, DEFAULT_SETTINGS.partnerChanges),
    reminders: {
      breakfast: timedSwitch(reminders.breakfast, DEFAULT_SETTINGS.reminders.breakfast),
      lunch: timedSwitch(reminders.lunch, DEFAULT_SETTINGS.reminders.lunch),
      dinner: timedSwitch(reminders.dinner, DEFAULT_SETTINGS.reminders.dinner),
    },
    summary: {
      ...timedSwitch(summary, DEFAULT_SETTINGS.summary),
      day: summary.day === 'same' || summary.day === 'previous' ? summary.day : 'previous',
    },
    unsavedDish: {
      on: booleanOr(unsavedDish.on, DEFAULT_SETTINGS.unsavedDish.on),
      afterMinutes: (UNSAVED_DISH_MINUTES as readonly unknown[]).includes(minutes)
        ? (minutes as number)
        : DEFAULT_SETTINGS.unsavedDish.afterMinutes,
    },
    weeklyReview: booleanOr(raw.weeklyReview, DEFAULT_SETTINGS.weeklyReview),
  }
}

/** Minutes since local midnight of an HH:MM time. */
export function minutesOf(time: string): number {
  const [hours = 0, minutes = 0] = time.split(':').map(Number)
  return hours * 60 + minutes
}
