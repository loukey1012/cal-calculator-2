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

/** What the day summary can tell, in the order the person chose. */
export type SummaryPartId =
  | 'status'
  | 'calories'
  | 'protein'
  | 'carbs'
  | 'fat'
  | 'fiber'
  | 'sugar'
  | 'salt'
  | 'missingMeals'
  | 'weekAverage'
  | 'weekSaved'

export type SummaryPart = { readonly id: SummaryPartId; readonly on: boolean }

/** Today's message layout: the default order, and which parts are on. */
export const DEFAULT_SUMMARY_PARTS: ReadonlyArray<SummaryPart> = [
  { id: 'status', on: true },
  { id: 'protein', on: true },
  { id: 'carbs', on: true },
  { id: 'fat', on: true },
  { id: 'calories', on: false },
  { id: 'fiber', on: false },
  { id: 'sugar', on: false },
  { id: 'salt', on: false },
  { id: 'missingMeals', on: false },
  { id: 'weekAverage', on: false },
  { id: 'weekSaved', on: false },
]

export const SUMMARY_PART_IDS: readonly SummaryPartId[] = DEFAULT_SUMMARY_PARTS.map(
  (part) => part.id,
)

export const SUMMARY_PART_LABELS: Readonly<Record<SummaryPartId, string>> = {
  status: 'Cheat or alcohol day',
  calories: 'Calories left or over',
  protein: 'Protein',
  carbs: 'Carbs',
  fat: 'Fat',
  fiber: 'Fiber',
  sugar: 'Sugar',
  salt: 'Salt',
  missingMeals: 'Missing meals',
  weekAverage: 'Week so far: Ø calories',
  weekSaved: 'Week so far: calories saved',
}

export type NotificationSettings = {
  /** the partner logs, changes or deletes food in my meals, or shares a dish with me */
  readonly partnerChanges: boolean
  /** a meal still empty at its time */
  readonly reminders: Readonly<Record<ReminderMeal, TimedSwitch>>
  readonly summary: TimedSwitch & {
    readonly day: SummaryDay
    /** every part exactly once, in the order told */
    readonly parts: ReadonlyArray<SummaryPart>
    /** hide nutrients whose goal isn't set (sugar and salt have none) */
    readonly onlyWithGoal: boolean
  }
  /** a dish left in Add food without being logged */
  readonly unsavedDish: { readonly on: boolean; readonly afterMinutes: number }
  /** the weekly review found something new */
  readonly weeklyReview: boolean
  /** every Monday: the week before (calories saved, average, days within goal) */
  readonly weekly: TimedSwitch
}

export const DEFAULT_SETTINGS: NotificationSettings = {
  partnerChanges: true,
  reminders: {
    breakfast: { on: true, time: '10:00' },
    lunch: { on: true, time: '14:00' },
    dinner: { on: true, time: '20:00' },
  },
  summary: {
    on: true,
    day: 'previous',
    time: '08:00',
    parts: DEFAULT_SUMMARY_PARTS,
    onlyWithGoal: false,
  },
  unsavedDish: { on: true, afterMinutes: 30 },
  weeklyReview: true,
  weekly: { on: true, time: '08:00' },
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

/**
 * Known parts keep their saved order and on-state (unknown and repeated ones are dropped); parts
 * missing from the list (old settings, parts added later) come last with their default state.
 */
function parseSummaryParts(value: unknown): ReadonlyArray<SummaryPart> {
  if (!Array.isArray(value)) return DEFAULT_SUMMARY_PARTS
  const seen = new Set<SummaryPartId>()
  const kept: SummaryPart[] = []
  for (const entry of value) {
    const raw = objectOf(entry)
    const id = SUMMARY_PART_IDS.find((candidate) => candidate === raw.id)
    if (id === undefined || seen.has(id)) continue
    seen.add(id)
    const fallback = DEFAULT_SUMMARY_PARTS.find((part) => part.id === id)?.on ?? false
    kept.push({ id, on: booleanOr(raw.on, fallback) })
  }
  const missing = DEFAULT_SUMMARY_PARTS.filter((part) => !seen.has(part.id))
  return [...kept, ...missing]
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
      parts: parseSummaryParts(summary.parts),
      onlyWithGoal: booleanOr(summary.onlyWithGoal, DEFAULT_SETTINGS.summary.onlyWithGoal),
    },
    unsavedDish: {
      on: booleanOr(unsavedDish.on, DEFAULT_SETTINGS.unsavedDish.on),
      afterMinutes: (UNSAVED_DISH_MINUTES as readonly unknown[]).includes(minutes)
        ? (minutes as number)
        : DEFAULT_SETTINGS.unsavedDish.afterMinutes,
    },
    weeklyReview: booleanOr(raw.weeklyReview, DEFAULT_SETTINGS.weeklyReview),
    weekly: timedSwitch(raw.weekly, DEFAULT_SETTINGS.weekly),
  }
}

/** Minutes since local midnight of an HH:MM time. */
export function minutesOf(time: string): number {
  const [hours = 0, minutes = 0] = time.split(':').map(Number)
  return hours * 60 + minutes
}
