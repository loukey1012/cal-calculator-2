import { dayLabel, MEAL_LABELS, MEAL_ORDER, addDays, type PushMessage } from './schedule.ts'

/**
 * What the partner changed on my days, as one notification. A flag is only ever "a flag": which one
 * (gym, cheat, alcohol) is never said.
 */

export type PartnerChange = {
  readonly date: string
  readonly kind: 'meal' | 'flag' | 'note'
  /** meal: the meal; flag: day_mark | gym | cheat_meal:<meal>; note: day | <meal> */
  readonly subject: string
  /** flags only: the value before the first change not told yet */
  readonly before: string | null
}

// partner changes are told once nothing new came for a few minutes (one notice, not one per food)
const PARTNER_QUIET_MINUTES = 3
const RECENT_WEEKDAY_DAYS = 6
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export function isQuiet(changedAt: readonly string[], now: Date): boolean {
  if (changedAt.length === 0) return false
  const times = changedAt.map((time) => Date.parse(time)).filter((time) => !Number.isNaN(time))
  if (times.length === 0) return false
  return now.getTime() - Math.max(...times) >= PARTNER_QUIET_MINUTES * 60_000
}

export type ChangeRow = PartnerChange & { readonly actor_id: string; readonly changed_at: string }

function validSubject(kind: PartnerChange['kind'], subject: string): boolean {
  const isMeal = (value: string) => (MEAL_ORDER as readonly string[]).includes(value)
  if (kind === 'meal') return isMeal(subject)
  if (kind === 'note') return subject === 'day' || isMeal(subject)
  if (subject === 'day_mark' || subject === 'gym') return true
  return subject.startsWith('cheat_meal:') && isMeal(subject.slice('cheat_meal:'.length))
}

/** A row from partner_changes with every field checked; null when something is off. */
export function parseChangeRow(raw: unknown): ChangeRow | null {
  if (typeof raw !== 'object' || raw === null) return null
  const row = raw as Record<string, unknown>
  const { actor_id, date, kind, subject, before, changed_at } = row
  if (typeof actor_id !== 'string' || typeof date !== 'string') return null
  if (typeof subject !== 'string' || typeof changed_at !== 'string') return null
  if (kind !== 'meal' && kind !== 'flag' && kind !== 'note') return null
  if (before !== null && typeof before !== 'string') return null
  if (Number.isNaN(Date.parse(changed_at)) || !validSubject(kind, subject)) return null
  return { actor_id, date, kind, subject, before, changed_at }
}

/**
 * Drops flag changes that are back at their old value; meals and notes are always kept. A subject
 * `current` doesn't know (undefined) is kept too: better one notice too many than one lost.
 */
export function stillChanged<T extends PartnerChange>(
  rows: readonly T[],
  current: (date: string, subject: string) => string | undefined,
): T[] {
  return rows.filter((row) => {
    if (row.kind !== 'flag') return true
    const now = current(row.date, row.subject)
    return now === undefined || row.before !== now
  })
}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many
}

function englishList(items: readonly string[]): string {
  if (items.length < 2) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`
}

type Counts = { readonly meals: readonly string[]; readonly flags: number; readonly notes: number }

function countsOf(changes: readonly PartnerChange[]): Counts {
  const of = (kind: PartnerChange['kind']) => changes.filter((change) => change.kind === kind)
  const meals = of('meal').map((change) => change.subject)
  return {
    meals: MEAL_ORDER.filter((meal) => meals.includes(meal)).map((meal) => MEAL_LABELS[meal]),
    flags: new Set(of('flag').map((change) => `${change.date}|${change.subject}`)).size,
    notes: new Set(of('note').map((change) => `${change.date}|${change.subject}`)).size,
  }
}

function partsOf({ meals, flags, notes }: Counts): string {
  return englishList([
    ...(meals.length > 0 ? ['your meals'] : []),
    ...(flags > 0 ? [plural(flags, 'a flag', 'flags')] : []),
    ...(notes > 0 ? [plural(notes, 'a note', 'notes')] : []),
  ])
}

function detailsOf({ meals, flags, notes }: Counts): string {
  return [
    ...meals,
    ...(flags > 0 ? [plural(flags, 'a flag', `${flags} flags`)] : []),
    ...(notes > 0 ? [plural(notes, 'a note', `${notes} notes`)] : []),
  ].join(', ')
}

function whenText(date: string, today: string): string {
  if (date === today) return 'today'
  if (date === addDays(today, -1)) return 'yesterday'
  for (let back = 2; back <= RECENT_WEEKDAY_DAYS; back += 1) {
    if (date === addDays(today, -back)) {
      return `on ${WEEKDAY_NAMES[new Date(`${date}T00:00:00Z`).getUTCDay()]}`
    }
  }
  const [, month = 1, day = 1] = date.split('-').map(Number)
  return `on ${day} ${MONTH_NAMES[month - 1]}`
}

const MAX_DAY_LINES = 4

/** One notice for everything the partner changed in my days; null when nothing is left to tell. */
export function partnerChangeMessage(
  actorName: string,
  changes: readonly PartnerChange[],
  today: string,
): PushMessage | null {
  const counts = countsOf(changes)
  const parts = partsOf(counts)
  if (parts === '') return null
  const dates = [...new Set(changes.map((change) => change.date))].toSorted().toReversed()
  const latest = dates[0] ?? today
  const url = latest === today ? '/today' : `/history/${latest}`
  const title = `${actorName} changed ${parts}`
  if (dates.length <= 1) {
    return {
      title: `${title} ${whenText(latest, today)}`,
      ...(counts.meals.length > 0 && { body: detailsOf(counts) }),
      url,
      tag: 'partner',
    }
  }
  const lines = dates
    .slice(0, MAX_DAY_LINES)
    .map(
      (date) =>
        `${dayLabel(date, today)}: ${detailsOf(countsOf(changes.filter((change) => change.date === date)))}`,
    )
  const more = dates.length - MAX_DAY_LINES
  const shown = more > 0 ? [...lines, `+${more} more ${plural(more, 'day', 'days')}`] : lines
  return { title, body: shown.join(' · '), url, tag: 'partner' }
}
