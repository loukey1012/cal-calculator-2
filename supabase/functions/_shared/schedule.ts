import { type WeekFigures, type WeekNutrientId } from './weekSummary.ts'
import { addDays, isoWeekday, previousIsoWeek, weekPath, type IsoWeek } from './isoWeek.ts'
import { isMissingMeals, missingMainMeals } from './dayCounting.ts'
import {
  DEFAULT_SETTINGS,
  minutesOf,
  REMINDER_MEALS,
  type NotificationSettings,
  type ReminderMeal,
  type SummaryDay,
  type SummaryPartId,
  type WeeklyPart,
  type WeeklyPartId,
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

type SummarySettings = NotificationSettings['summary']

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

export const MEAL_LABELS: Readonly<Record<MealType, string>> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
}
export const MEAL_ORDER: readonly MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

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
  readonly fiber?: number | null
  readonly sugar?: number | null
  readonly salt?: number | null
  readonly mealCount: number
  readonly cheatDay: boolean
  readonly cheatMeal: boolean
  readonly alcoholDay: boolean
  readonly kcalEstimated: boolean
  readonly lunchLogged?: boolean
  readonly dinnerLogged?: boolean
}

export type SummaryGoal = {
  readonly kcal: number
  readonly protein: number | null
  readonly carbs: number | null
  readonly fat: number | null
  readonly fiber?: number | null
}

/** The week so far (counted days up to the summary day); null when no day counted. */
export type SummaryWeek = Pick<WeekFigures, 'averageKcal' | 'saved'> | null

type NutrientId = WeekNutrientId

const NUTRIENTS: Readonly<Record<NutrientId, string>> = {
  protein: 'Protein',
  carbs: 'Carbs',
  fat: 'Fat',
  fiber: 'Fiber',
  sugar: 'Sugar',
  salt: 'Salt',
}

function grams(label: string, value: number | null, goal: number | null): string | null {
  if (value === null) return null
  const rounded = Math.round(value)
  return goal === null ? `${label} ${rounded} g` : `${label} ${rounded} of ${Math.round(goal)} g`
}

function statusOf(day: DaySummary): string | null {
  if (day.cheatDay) return 'Cheat day'
  if (day.alcoholDay) return 'Alcohol day'
  return day.cheatMeal ? 'Cheat meal' : null
}

/** Left or over the goal; nothing without one. */
function caloriesOf(day: DaySummary, goal: SummaryGoal | null): string | null {
  if (!goal) return null
  const difference = Math.round(goal.kcal) - Math.round(day.kcal)
  return difference >= 0 ? `${difference} kcal left` : `${-difference} kcal over`
}

/** The app's rule, judging the summary's day as over (also the same evening, as the week does). */
function missingMealsOf(day: DaySummary): string | null {
  if (!isMissingMeals(day.date, day, addDays(day.date, 1))) return null
  const text = `${missingMainMeals(day).join(' and ')} missing`
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function weekAverageOf(week: SummaryWeek): string | null {
  return week ? `Week Ø ${kcalText.format(week.averageKcal)} kcal` : null
}

function weekSavedOf(week: SummaryWeek): string | null {
  const text = savedText(week?.saved ?? null)
  return text === null ? null : `Week ${text}`
}

export function summaryMessage(
  day: DaySummary,
  goal: SummaryGoal | null,
  which: SummaryDay,
  options: {
    readonly parts?: SummarySettings['parts']
    readonly onlyWithGoal?: boolean
    readonly week?: SummaryWeek
  } = {},
): PushMessage {
  const { parts = DEFAULT_SETTINGS.summary.parts, onlyWithGoal = false, week = null } = options
  const kcal = `${day.kcalEstimated ? '~' : ''}${Math.round(day.kcal)}`
  const total = goal ? `${kcal} of ${Math.round(goal.kcal)} kcal` : `${kcal} kcal`
  const nutrient = (id: NutrientId): string | null => {
    const target = id === 'sugar' || id === 'salt' ? null : (goal?.[id] ?? null)
    if (onlyWithGoal && target === null) return null
    return grams(NUTRIENTS[id], day[id] ?? null, target)
  }
  const textOf = (id: SummaryPartId): string | null => {
    switch (id) {
      case 'status':
        return statusOf(day)
      case 'calories':
        return caloriesOf(day, goal)
      case 'missingMeals':
        return missingMealsOf(day)
      case 'weekAverage':
        return weekAverageOf(week)
      case 'weekSaved':
        return weekSavedOf(week)
      default:
        return nutrient(id)
    }
  }
  const body = parts.filter((part) => part.on).map((part) => textOf(part.id))
  return {
    title: `${which === 'previous' ? 'Yesterday' : 'Today'}: ${total}`,
    body: body.filter((part) => part !== null).join(' · '),
    url: which === 'previous' ? `/history/${day.date}` : '/today',
    tag: 'summary',
  }
}

const kcalText = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

const WEEKLY_NUTRIENT_LABELS: Readonly<Record<NutrientId, string>> = {
  protein: 'Ø protein',
  carbs: 'Ø carbs',
  fat: 'Ø fat',
  fiber: 'Ø fiber',
  sugar: 'Ø sugar',
  salt: 'Ø salt',
}

function savedText(saved: number | null): string | null {
  if (saved === null) return null
  return saved >= 0
    ? `${kcalText.format(saved)} kcal saved`
    : `${kcalText.format(-saved)} kcal surplus`
}

function withinText(within: WeekFigures['within']): string | null {
  return within
    ? `${within.within} of ${within.of} ${within.of === 1 ? 'day' : 'days'} within goal`
    : null
}

function burnedEatenText(figures: WeekFigures): string | null {
  const { burned, eaten } = figures
  if (burned === null || eaten === null) return null
  return `Burned ${kcalText.format(burned)} · ate ${kcalText.format(eaten)} kcal`
}

function leftOutText(count: number): string | null {
  return count > 0 ? `${count} ${count === 1 ? 'day' : 'days'} not counted` : null
}

function weeklyTextOf(
  id: WeeklyPartId,
  figures: WeekFigures,
  onlyWithGoal: boolean,
): string | null {
  switch (id) {
    case 'saved':
      return savedText(figures.saved)
    case 'average':
      return `Ø ${kcalText.format(figures.averageKcal)} kcal`
    case 'withinGoal':
      return withinText(figures.within)
    case 'burnedEaten':
      return burnedEatenText(figures)
    case 'leftOut':
      return leftOutText(figures.leftOut)
    default: {
      const nutrient = figures.nutrients[id]
      if (!nutrient || (onlyWithGoal && nutrient.goal === null)) return null
      return grams(WEEKLY_NUTRIENT_LABELS[id], nutrient.average, nutrient.goal)
    }
  }
}

/** The notification for a week with figures; never a weight. */
export function weeklyMessageOf(
  week: IsoWeek,
  figures: WeekFigures,
  options: {
    readonly parts?: ReadonlyArray<WeeklyPart>
    readonly onlyWithGoal?: boolean
  } = {},
): PushMessage {
  const { parts = DEFAULT_SETTINGS.weekly.parts, onlyWithGoal = false } = options
  const texts = parts
    .filter((part) => part.on)
    .map((part) => weeklyTextOf(part.id, figures, onlyWithGoal))
    .filter((text) => text !== null)
  const [first, ...rest] = texts
  const prefix = `Week ${week.week}`
  return {
    title: first === undefined ? prefix : `${prefix}: ${first}`,
    ...(rest.length > 0 && { body: rest.join(' · ') }),
    url: weekPath(week),
    tag: 'weekly',
  }
}

/** The week before. Null when no day counted: nothing to tell. */
export function weeklyMessage(
  week: IsoWeek,
  figures: WeekFigures | null,
  options: Parameters<typeof weeklyMessageOf>[2] = {},
): PushMessage | null {
  return figures && weeklyMessageOf(week, figures, options)
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function dayLabel(date: string, today: string): string {
  if (date === today) return 'Today'
  if (date === addDays(today, -1)) return 'Yesterday'
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number)
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return `${WEEKDAYS[weekday]} ${day} ${MONTHS[month - 1]}`
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
