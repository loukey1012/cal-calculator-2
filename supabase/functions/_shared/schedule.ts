import { type WeekFigures } from './weekSummary.ts'
import { addDays, isoWeekday, previousIsoWeek, weekPath, type IsoWeek } from './isoWeek.ts'
import {
  minutesOf,
  REMINDER_MEALS,
  type NotificationSettings,
  type ReminderMeal,
  type SummaryDay,
} from './notificationSettings.ts'

/**
 * What push-tick sends when (plain TypeScript, tested with the app's tests). The tick runs every
 * few minutes; a timed notification is due from its time on for a while, and the sent-log makes
 * sure it goes out once.
 */

export type MealType = ReminderMeal | 'snack'

export type PushMessage = {
  readonly title: string
  readonly body?: string
  readonly url?: string
  readonly tag?: string
}

/** local YYYY-MM-DD and minutes since local midnight */
type LocalNow = { readonly date: string; readonly minutes: number }

const DEFAULT_TIME_ZONE = 'Europe/Vienna'
// a tick missed (e.g. the server was busy) still sends, but nothing arrives hours late
const DUE_WINDOW_MINUTES = 120

export function localNow(now: Date, timeZone: string | null): LocalNow {
  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone ?? DEFAULT_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now)
  } catch {
    // an unknown time zone name
    return localNow(now, DEFAULT_TIME_ZONE)
  }
  const part = (type: string) => parts.find((candidate) => candidate.type === type)?.value ?? '0'
  return {
    date: `${part('year')}-${part('month')}-${part('day')}`,
    minutes: Number(part('hour')) * 60 + Number(part('minute')),
  }
}

export { addDays }

export function isDue(time: string, now: LocalNow): boolean {
  const from = minutesOf(time)
  return now.minutes >= from && now.minutes < from + DUE_WINDOW_MINUTES
}

export type Planned =
  | {
      readonly kind: 'reminder'
      readonly key: string
      readonly meal: ReminderMeal
      readonly date: string
    }
  | { readonly kind: 'summary'; readonly key: string; readonly date: string }
  /** key: the Monday of the week it is about */
  | { readonly kind: 'weekly'; readonly key: string; readonly week: IsoWeek }

const MONDAY = 1

/** What the clock says is due now (the tick then checks the sent-log and the day's food). */
export function plannedByClock(settings: NotificationSettings, now: LocalNow): Planned[] {
  const reminders = REMINDER_MEALS.flatMap((meal): Planned[] => {
    const reminder = settings.reminders[meal]
    return reminder.on && isDue(reminder.time, now)
      ? [{ kind: 'reminder', key: `${now.date}:${meal}`, meal, date: now.date }]
      : []
  })
  const { summary, weekly } = settings
  const planned: Planned[] = [...reminders]
  if (summary.on && isDue(summary.time, now)) {
    const date = summary.day === 'previous' ? addDays(now.date, -1) : now.date
    planned.push({ kind: 'summary', key: date, date })
  }
  // Mondays only: about the week that ended yesterday
  if (weekly.on && isoWeekday(now.date) === MONDAY && isDue(weekly.time, now)) {
    const week = previousIsoWeek(now.date)
    planned.push({ kind: 'weekly', key: addDays(now.date, -7), week })
  }
  return planned
}

const MEAL_LABELS: Readonly<Record<MealType, string>> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
}
const MEAL_ORDER: readonly MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

/** e.g. /cook?person=u1&date=2026-10-20&meal=lunch&from=%2Ftoday (src/features/cook/legacyCookLink.ts sends it to the meal) */
function cookLink(userId: string, date: string, meal: MealType): string {
  const params = new URLSearchParams({ person: userId, date, meal, from: '/today' })
  return `/cook?${params.toString()}`
}

export function reminderMessage(userId: string, meal: ReminderMeal, date: string): PushMessage {
  return {
    title: MEAL_LABELS[meal],
    body: `Nothing logged for ${MEAL_LABELS[meal].toLowerCase()} yet.`,
    url: cookLink(userId, date, meal),
    tag: `reminder:${meal}`,
  }
}

export type DaySummary = {
  readonly date: string
  readonly kcal: number
  readonly protein: number | null
  readonly carbs: number | null
  readonly fat: number | null
  readonly mealCount: number
  readonly cheatDay: boolean
  readonly cheatMeal: boolean
  readonly alcoholDay: boolean
  readonly kcalEstimated: boolean
}

type SummaryGoal = {
  readonly kcal: number
  readonly protein: number | null
  readonly carbs: number | null
  readonly fat: number | null
}

function grams(label: string, value: number | null, goal: number | null): string | null {
  if (value === null) return null
  return goal === null
    ? `${label} ${Math.round(value)} g`
    : `${label} ${Math.round(value)} of ${Math.round(goal)} g`
}

export function summaryMessage(
  day: DaySummary,
  goal: SummaryGoal | null,
  which: SummaryDay,
): PushMessage {
  const kcal = `${day.kcalEstimated ? '~' : ''}${Math.round(day.kcal)}`
  const total = goal ? `${kcal} of ${Math.round(goal.kcal)} kcal` : `${kcal} kcal`
  const flag = day.cheatDay
    ? 'Cheat day'
    : day.alcoholDay
      ? 'Alcohol day'
      : day.cheatMeal
        ? 'Cheat meal'
        : null
  const body = [
    flag,
    grams('Protein', day.protein, goal?.protein ?? null),
    grams('Carbs', day.carbs, goal?.carbs ?? null),
    grams('Fat', day.fat, goal?.fat ?? null),
  ].filter((part) => part !== null)
  return {
    title: `${which === 'previous' ? 'Yesterday' : 'Today'}: ${total}`,
    body: body.join(' · '),
    url: which === 'previous' ? `/history/${day.date}` : '/today',
    tag: 'summary',
  }
}

const kcalText = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

/** The week before, never a weight. Null when no day counted: nothing to tell. */
export function weeklyMessage(week: IsoWeek, figures: WeekFigures | null): PushMessage | null {
  if (!figures) return null
  const average = `Ø ${kcalText.format(figures.averageKcal)} kcal`
  const within = figures.within
    ? `${figures.within.within} of ${figures.within.of} ${figures.within.of === 1 ? 'day' : 'days'} within goal`
    : null
  const prefix = `Week ${week.week}:`
  const saved = figures.saved
  const title =
    saved === null
      ? `${prefix} ${average}`
      : saved >= 0
        ? `${prefix} ${kcalText.format(saved)} kcal saved`
        : `${prefix} ${kcalText.format(-saved)} kcal surplus`
  const body = (saved === null ? [within] : [average, within]).filter((part) => part !== null)
  return {
    title,
    ...(body.length > 0 && { body: body.join(' · ') }),
    url: weekPath(week),
    tag: 'weekly',
  }
}

type PartnerChange = { readonly date: string; readonly mealType: MealType }

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function dayLabel(date: string, today: string): string {
  if (date === today) return 'Today'
  if (date === addDays(today, -1)) return 'Yesterday'
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number)
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return `${WEEKDAYS[weekday]} ${day} ${MONTHS[month - 1]}`
}

/** One notice for everything the partner changed in my days since the last one. */
export function partnerChangeMessage(
  actorName: string,
  changes: readonly PartnerChange[],
  today: string,
): PushMessage {
  const dates = [...new Set(changes.map((change) => change.date))].toSorted().toReversed()
  const lines = dates.map((date) => {
    const meals = MEAL_ORDER.filter((meal) =>
      changes.some((change) => change.date === date && change.mealType === meal),
    ).map((meal) => MEAL_LABELS[meal])
    return `${dayLabel(date, today)}: ${meals.join(', ')}`
  })
  const latest = dates[0] ?? today
  return {
    title: `${actorName} changed your meals`,
    body: lines.join(' · '),
    url: latest === today ? '/today' : `/history/${latest}`,
    tag: 'partner',
  }
}

// matches DEFAULT_PARTNER_LOOK in src/features/household/partnerLook.ts
const DEFAULT_PARTNER_NAME = 'baby'

/** The partner as the recipient calls them: their nickname for them, else the default. */
export function partnerName(recipientAppearance: unknown, partnerId: string): string {
  const looks = (recipientAppearance as { partnerLooks?: unknown } | null)?.partnerLooks
  const look = (looks as Record<string, { nickname?: unknown }> | undefined)?.[partnerId]
  return typeof look?.nickname === 'string' && look.nickname.trim() !== ''
    ? look.nickname
    : DEFAULT_PARTNER_NAME
}

// partner changes are told once nothing new came for a few minutes (one notice, not one per food)
const PARTNER_QUIET_MINUTES = 3

export function isQuiet(changedAt: readonly string[], now: Date): boolean {
  const latest = Math.max(...changedAt.map((time) => Date.parse(time)))
  return changedAt.length > 0 && now.getTime() - latest >= PARTNER_QUIET_MINUTES * 60_000
}

/** A dish left in Add food is told once it hasn't changed for the person's delay. */
export function isUnsavedDue(updatedAt: string, afterMinutes: number, now: Date): boolean {
  return now.getTime() - Date.parse(updatedAt) >= afterMinutes * 60_000
}

export function unsavedDishMessage(label: string): PushMessage {
  return {
    title: 'Not logged yet',
    body: `${label} is still waiting to be logged.`,
    // the app sends the old Cook address on to the meal the dish is for
    url: '/cook',
    tag: 'unsaved',
  }
}

// findings older than this were seen in the app already, or are left on purpose
const REVIEW_NOTICE_MAX_DAYS = 3

export function isRecentFinding(createdAt: string, now: Date): boolean {
  return now.getTime() - Date.parse(createdAt) <= REVIEW_NOTICE_MAX_DAYS * 86_400_000
}

export function reviewMessage(openCount: number): PushMessage {
  return {
    title: 'Weekly review',
    body: openCount === 1 ? '1 thing to check.' : `${openCount} things to check.`,
    url: '/ingredients',
    tag: 'review',
  }
}
