import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { json } from '../_shared/http.ts'
import {
  parseNotificationSettings,
  type NotificationSettings,
  type SummaryPartId,
} from '../_shared/notificationSettings.ts'
import {
  isRecentFinding,
  isUnsavedDue,
  localNow,
  MEAL_ORDER,
  partnerName,
  plannedByClock,
  reminderMessage,
  reviewMessage,
  summaryMessage,
  unsavedDishMessage,
  weeklyMessage,
  type MealType,
  type Planned,
  type PushMessage,
  type SummaryWeek,
} from '../_shared/schedule.ts'
import {
  isQuiet,
  parseChangeRow,
  partnerChangeMessage,
  stillChanged,
  type ChangeRow,
} from '../_shared/partnerChanges.ts'
import { isoWeekOf, weekDatesOf, type IsoWeek } from '../_shared/isoWeek.ts'
import { sendToAll, type Subscription } from '../_shared/sendPush.ts'
import { weekFigures, weekSoFar, type WeekDayRow } from '../_shared/weekSummary.ts'

/**
 * Runs every 5 minutes (pg_cron → pg_net, see the notification_schedule migration) and sends
 * what is due for everyone with a phone that has notifications on: meal reminders, the day
 * summary, the weekly summary (Mondays), the partner's changes, a dish left in Add food and new weekly review findings. Only
 * callable with the shared tick secret.
 */

// the sent-log only needs to outlive the due windows
const SENT_LOG_DAYS = 14
// changes nobody was told about (no phone with notifications) don't pile up
const PARTNER_CHANGES_MAX_HOURS = 24

type Profile = {
  readonly id: string
  readonly household_id: string | null
  readonly appearance: unknown
  readonly notification_settings: unknown
  readonly time_zone: string | null
  /** calories burned per day, or null when not set */
  readonly kcal_burned: number | null
}

const WEEK_DAY_COLUMNS =
  'date, kcal, meal_count, cheat_day, cheat_meal, alcohol_day, lunch_logged, dinner_logged'
const WEEKLY_DAY_COLUMNS = `${WEEK_DAY_COLUMNS}, protein, carbs, fat, fiber, sugar, salt`
const WEEK_PARTS: readonly SummaryPartId[] = ['weekAverage', 'weekSaved']

type WeekDayData = {
  readonly date: string | null
  readonly kcal: number | null
  readonly meal_count: number | null
  readonly cheat_day: boolean | null
  readonly cheat_meal: boolean | null
  readonly alcohol_day: boolean | null
  readonly lunch_logged: boolean | null
  readonly dinner_logged: boolean | null
  // only in the weekly summary's query
  readonly protein?: number | null
  readonly carbs?: number | null
  readonly fat?: number | null
  readonly fiber?: number | null
  readonly sugar?: number | null
  readonly salt?: number | null
}

// same defaults as the app's week data (src/features/history/week/weekApi.ts)
function weekDayOf(row: WeekDayData): WeekDayRow {
  return {
    date: row.date ?? '',
    kcal: row.kcal ?? 0,
    mealCount: row.meal_count ?? 0,
    cheatDay: row.cheat_day ?? false,
    cheatMeal: row.cheat_meal ?? false,
    alcoholDay: row.alcohol_day ?? false,
    lunchLogged: row.lunch_logged ?? false,
    dinnerLogged: row.dinner_logged ?? false,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    fiber: row.fiber,
    sugar: row.sugar,
    salt: row.salt,
  }
}

type Outgoing = { readonly kind: string; readonly key: string; readonly message: PushMessage }

async function mealIsLogged(admin: SupabaseClient, userId: string, date: string, meal: MealType) {
  const { data, error } = await admin
    .from('meal_totals')
    .select('item_count, cheat_meal')
    .eq('user_id', userId)
    .eq('date', date)
    .eq('meal_type', meal)
    .maybeSingle()
  if (error) throw new Error(`meal_totals: ${error.message}`)
  // a meal marked as a cheat meal (eaten out) needs no reminder either
  return (data?.item_count ?? 0) > 0 || data?.cheat_meal === true
}

/** The week so far, Monday to the summary day (that day counts if it is complete). */
async function weekSoFarFor(
  admin: SupabaseClient,
  userId: string,
  date: string,
  kcalBurned: number | null,
): Promise<SummaryWeek> {
  const first = weekDatesOf(isoWeekOf(date))[0] ?? date
  const totals = await admin
    .from('daily_totals')
    .select(WEEK_DAY_COLUMNS)
    .eq('user_id', userId)
    .gte('date', first)
    .lte('date', date)
  if (totals.error) throw new Error(`daily_totals: ${totals.error.message}`)
  return weekSoFar(totals.data.map(weekDayOf), kcalBurned, date)
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function summaryFor(
  admin: SupabaseClient,
  profile: Profile,
  date: string,
  parts: NotificationSettings['summary']['parts'],
) {
  const userId = profile.id
  const day = await admin
    .from('daily_totals')
    .select(
      'kcal, protein, carbs, fat, fiber, sugar, salt, meal_count, cheat_day, cheat_meal, alcohol_day, kcal_estimated, lunch_logged, dinner_logged',
    )
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle()
  if (day.error) throw new Error(`daily_totals: ${day.error.message}`)
  if (!day.data || (day.data.meal_count ?? 0) === 0) return null
  const needsWeek = parts.some((part) => part.on && WEEK_PARTS.includes(part.id))
  const [goal, week] = await Promise.all([
    admin
      .from('goal_history')
      .select('kcal, protein_g, carbs_g, fat_g, fiber_g')
      .eq('user_id', userId)
      .lte('valid_from', date)
      .order('valid_from', { ascending: false })
      .limit(1)
      .maybeSingle(),
    needsWeek ? weekOrNothing(admin, userId, date, profile.kcal_burned) : null,
  ])
  if (goal.error) throw new Error(`goal_history: ${goal.error.message}`)
  return {
    day: {
      date,
      kcal: day.data.kcal ?? 0,
      protein: day.data.protein,
      carbs: day.data.carbs,
      fat: day.data.fat,
      fiber: day.data.fiber,
      sugar: day.data.sugar,
      salt: day.data.salt,
      mealCount: day.data.meal_count ?? 0,
      cheatDay: day.data.cheat_day === true,
      cheatMeal: day.data.cheat_meal === true,
      alcoholDay: day.data.alcohol_day === true,
      kcalEstimated: day.data.kcal_estimated === true,
      lunchLogged: day.data.lunch_logged === true,
      dinnerLogged: day.data.dinner_logged === true,
    },
    goal: goal.data
      ? {
          kcal: goal.data.kcal,
          protein: goal.data.protein_g,
          carbs: goal.data.carbs_g,
          fat: goal.data.fat_g,
          fiber: goal.data.fiber_g,
        }
      : null,
    week,
  }
}

/** A failed week only drops the week parts; the summary and the other messages still go out. */
async function weekOrNothing(
  admin: SupabaseClient,
  userId: string,
  date: string,
  kcalBurned: number | null,
): Promise<SummaryWeek> {
  try {
    return await weekSoFarFor(admin, userId, date, kcalBurned)
  } catch (error) {
    console.error('week so far failed for', userId, errorMessage(error))
    return null
  }
}

/** The week's figures for the weekly notification; null when no day counted. */
async function weeklyFor(admin: SupabaseClient, profile: Profile, week: IsoWeek, today: string) {
  const dates = weekDatesOf(week)
  const first = dates[0] ?? ''
  const last = dates.at(-1) ?? ''
  const totals = await admin
    .from('daily_totals')
    .select(WEEKLY_DAY_COLUMNS)
    .eq('user_id', profile.id)
    .gte('date', first)
    .lte('date', last)
  if (totals.error) throw new Error(`daily_totals: ${totals.error.message}`)
  // every goal up to the week's end: each day is judged against the goal valid on it
  const goals = await admin
    .from('goal_history')
    .select('valid_from, kcal, protein_g, carbs_g, fat_g, fiber_g')
    .eq('user_id', profile.id)
    .lte('valid_from', last)
  if (goals.error) throw new Error(`goal_history: ${goals.error.message}`)
  // same defaults as the app's week data (src/features/history/week/weekApi.ts)
  const days = totals.data.map(weekDayOf)
  return weekFigures(
    days,
    goals.data.map((row) => ({
      validFrom: row.valid_from,
      kcal: row.kcal,
      protein: row.protein_g,
      carbs: row.carbs_g,
      fat: row.fat_g,
      fiber: row.fiber_g,
    })),
    profile.kcal_burned,
    today,
  )
}

async function timedMessages(
  admin: SupabaseClient,
  profile: Profile,
  planned: readonly Planned[],
  today: string,
): Promise<Outgoing[]> {
  const settings = parseNotificationSettings(profile.notification_settings)
  const outgoing: Outgoing[] = []
  for (const item of planned) {
    if (item.kind === 'reminder') {
      if (await mealIsLogged(admin, profile.id, item.date, item.meal)) continue
      outgoing.push({
        kind: 'reminder',
        key: item.key,
        message: reminderMessage(profile.id, item.meal, item.date),
      })
    } else if (item.kind === 'weekly') {
      // a failed week only skips the weekly summary (tried again next tick), never the reminders
      try {
        const message = weeklyMessage(
          item.week,
          await weeklyFor(admin, profile, item.week, today),
          { parts: settings.weekly.parts, onlyWithGoal: settings.weekly.onlyWithGoal },
        )
        if (message) outgoing.push({ kind: 'weekly', key: item.key, message })
      } catch (error) {
        console.error('weekly summary failed for', profile.id, errorMessage(error))
      }
    } else {
      const summary = await summaryFor(admin, profile, item.date, settings.summary.parts)
      if (!summary) continue
      outgoing.push({
        kind: 'summary',
        key: item.key,
        message: summaryMessage(summary.day, summary.goal, settings.summary.day, {
          parts: settings.summary.parts,
          onlyWithGoal: settings.summary.onlyWithGoal,
          week: summary.week,
        }),
      })
    }
  }
  return outgoing
}

/**
 * What a flag change is compared with: the flags as they are now, for the days that changed. A
 * subject that was not loaded gives undefined (kept, not dropped).
 */
async function currentFlags(
  admin: SupabaseClient,
  userId: string,
  dates: readonly string[],
): Promise<(date: string, subject: string) => string | undefined> {
  const [marks, gyms, meals] = await Promise.all([
    admin.from('cheat_days').select('date, kind').eq('user_id', userId).in('date', dates),
    admin.from('gym_days').select('date').eq('user_id', userId).in('date', dates),
    admin
      .from('meals')
      .select('date, meal_type')
      .eq('user_id', userId)
      .eq('cheat_meal', true)
      .in('date', dates),
  ])
  if (marks.error) throw new Error(`cheat_days: ${marks.error.message}`)
  if (gyms.error) throw new Error(`gym_days: ${gyms.error.message}`)
  if (meals.error) throw new Error(`meals: ${meals.error.message}`)
  const values = new Map<string, string>([
    ...marks.data.map((row): [string, string] => [`${row.date}|day_mark`, String(row.kind)]),
    ...gyms.data.map((row): [string, string] => [`${row.date}|gym`, 'on']),
    ...meals.data.map((row): [string, string] => [`${row.date}|cheat_meal:${row.meal_type}`, 'on']),
  ])
  const loaded = new Set(dates)
  const cheatMeals = MEAL_ORDER.map((meal) => `cheat_meal:${meal}`)
  return (date, subject) => {
    const known = values.get(`${date}|${subject}`)
    if (known !== undefined) return known
    if (!loaded.has(date)) return undefined
    if (subject === 'day_mark') return 'none'
    return subject === 'gym' || cheatMeals.includes(subject) ? 'off' : undefined
  }
}

/** The partner's changes still standing, one notice per person who made them. */
async function toldMessages(
  admin: SupabaseClient,
  profile: Profile,
  rows: readonly ChangeRow[],
  latest: string,
  today: string,
): Promise<Outgoing[]> {
  const flagDates = [...new Set(rows.filter((row) => row.kind === 'flag').map((row) => row.date))]
  const current = flagDates.length > 0 ? await currentFlags(admin, profile.id, flagDates) : null
  const told = current ? stillChanged(rows, current) : rows
  const actors = [...new Set(rows.map((row) => row.actor_id))]
  return actors.flatMap((actorId) => {
    const changes = told.filter((row) => row.actor_id === actorId)
    const message = partnerChangeMessage(partnerName(profile.appearance, actorId), changes, today)
    return message ? [{ kind: 'partner' as const, key: `${actorId}:${latest}`, message }] : []
  })
}

/** The partner's changes, once they stopped changing for a moment; told ones are cleared. */
async function partnerMessages(
  admin: SupabaseClient,
  profile: Profile,
  today: string,
  now: Date,
): Promise<Outgoing[]> {
  const settings = parseNotificationSettings(profile.notification_settings)
  const { data, error } = await admin
    .from('partner_changes')
    .select('actor_id, date, kind, subject, before, changed_at')
    .eq('user_id', profile.id)
  if (error) throw new Error(`partner_changes: ${error.message}`)
  if (data.length === 0) return []
  // rows that don't parse are dropped (and cleared below with the others)
  const rows = data.flatMap((raw) => {
    const row = parseChangeRow(raw)
    if (!row) console.warn('partner change dropped, unreadable row for', profile.id)
    return row ? [row] : []
  })
  if (
    settings.partnerChanges &&
    !isQuiet(
      data.map((row) => String(row.changed_at)),
      now,
    )
  )
    return []

  const latest = data
    .map((row) => String(row.changed_at))
    .toSorted()
    .at(-1)
  // read and build everything first: a failure above leaves the rows for the next tick
  const messages = settings.partnerChanges
    ? await toldMessages(admin, profile, rows, latest ?? '', today)
    : []
  const cleared = await admin
    .from('partner_changes')
    .delete()
    .eq('user_id', profile.id)
    .lte('changed_at', latest ?? '')
  if (cleared.error) throw new Error(`partner_changes: ${cleared.error.message}`)
  return messages
}

/** A dish left in Add food, once per change of it, after the person's delay. */
async function unsavedMessages(
  admin: SupabaseClient,
  profile: Profile,
  now: Date,
): Promise<Outgoing[]> {
  const { unsavedDish } = parseNotificationSettings(profile.notification_settings)
  if (!unsavedDish.on) return []
  const { data, error } = await admin
    .from('cook_drafts')
    .select('label, line_count, updated_at')
    .eq('user_id', profile.id)
    .maybeSingle()
  if (error) throw new Error(`cook_drafts: ${error.message}`)
  if (!data || data.line_count === 0) return []
  if (!isUnsavedDue(data.updated_at, unsavedDish.afterMinutes, now)) return []
  return [{ kind: 'unsaved', key: data.updated_at, message: unsavedDishMessage(data.label) }]
}

/** New open findings of the weekly review, once per review run. */
async function reviewMessages(
  admin: SupabaseClient,
  profile: Profile,
  now: Date,
): Promise<Outgoing[]> {
  const { weeklyReview } = parseNotificationSettings(profile.notification_settings)
  if (!weeklyReview || !profile.household_id) return []
  const { data, error } = await admin
    .from('review_findings')
    .select('created_at')
    .eq('household_id', profile.household_id)
    .eq('status', 'open')
  if (error) throw new Error(`review_findings: ${error.message}`)
  const newest = data
    .map((row) => row.created_at)
    .toSorted()
    .at(-1)
  if (!newest || !isRecentFinding(newest, now)) return []
  return [{ kind: 'review', key: newest, message: reviewMessage(data.length) }]
}

/** Notes it in the sent-log first: only a tick that adds the entry sends (never twice). */
async function claim(admin: SupabaseClient, userId: string, outgoing: Outgoing): Promise<boolean> {
  const { data, error } = await admin
    .from('push_sent')
    .upsert(
      { user_id: userId, kind: outgoing.kind, key: outgoing.key },
      { onConflict: 'user_id,kind,key', ignoreDuplicates: true },
    )
    .select('key')
  if (error) throw new Error(`push_sent: ${error.message}`)
  return data.length > 0
}

/** One message source failing must not take the others down. */
async function safely(
  label: string,
  profileId: string,
  build: () => Promise<Outgoing[]>,
): Promise<Outgoing[]> {
  try {
    return await build()
  } catch (error) {
    console.error(`${label} messages failed for`, profileId, error)
    return []
  }
}

async function tickFor(
  admin: SupabaseClient,
  profile: Profile,
  subscriptions: readonly Subscription[],
  now: Date,
): Promise<number> {
  const local = localNow(now, profile.time_zone)
  const settings = parseNotificationSettings(profile.notification_settings)
  const outgoing = [
    ...(await safely('timed', profile.id, () =>
      timedMessages(admin, profile, plannedByClock(settings, local), local.date),
    )),
    ...(await safely('partner', profile.id, () =>
      partnerMessages(admin, profile, local.date, now),
    )),
    ...(await safely('unsaved', profile.id, () => unsavedMessages(admin, profile, now))),
    ...(await safely('review', profile.id, () => reviewMessages(admin, profile, now))),
  ]
  let sent = 0
  for (const item of outgoing) {
    if (!(await claim(admin, profile.id, item))) continue
    const result = await sendToAll(admin, subscriptions, item.message)
    sent += result.sent
  }
  return sent
}

async function housekeeping(admin: SupabaseClient, now: Date): Promise<void> {
  const sentBefore = new Date(now.getTime() - SENT_LOG_DAYS * 86_400_000).toISOString()
  const changesBefore = new Date(now.getTime() - PARTNER_CHANGES_MAX_HOURS * 3_600_000)
  const sent = await admin.from('push_sent').delete().lt('sent_at', sentBefore)
  const changes = await admin
    .from('partner_changes')
    .delete()
    .lt('changed_at', changesBefore.toISOString())
  for (const { error } of [sent, changes]) {
    if (error) console.error('housekeeping failed', error.message)
  }
}

Deno.serve(async (request) => {
  const secret = Deno.env.get('PUSH_TICK_SECRET')
  if (!secret || request.headers.get('x-tick-secret') !== secret) {
    return json({ error: 'Not allowed' }, 401)
  }
  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )
  const now = new Date()

  const subscriptions = await admin
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
  if (subscriptions.error) {
    console.error('could not load subscriptions', subscriptions.error.message)
    return json({ error: 'Could not load subscriptions' }, 500)
  }
  const userIds = [...new Set(subscriptions.data.map((row) => row.user_id))]
  const loaded =
    userIds.length === 0
      ? { data: [], error: null }
      : await admin
          .from('profiles')
          .select(
            'id, household_id, appearance, kcal_burned, notification_preferences(settings, time_zone)',
          )
          .in('id', userIds)
  if (loaded.error) {
    console.error('could not load profiles', loaded.error.message)
    return json({ error: 'Could not load profiles' }, 500)
  }
  // nothing chosen yet: the defaults, on Vienna time
  const profiles: Profile[] = loaded.data.map((row) => {
    const preferences = row.notification_preferences as {
      settings?: unknown
      time_zone?: string | null
    } | null
    return {
      id: row.id,
      household_id: row.household_id,
      appearance: row.appearance,
      kcal_burned: row.kcal_burned,
      notification_settings: preferences?.settings ?? {},
      time_zone: preferences?.time_zone ?? null,
    }
  })

  const results: Record<string, number | string> = {}
  for (const profile of profiles) {
    try {
      const own = subscriptions.data.filter((row) => row.user_id === profile.id)
      results[profile.id] = await tickFor(admin, profile, own, now)
    } catch (error) {
      // one person's problem doesn't stop the others' notifications
      console.error('tick failed for', profile.id, (error as Error).message)
      results[profile.id] = 'failed'
    }
  }
  await housekeeping(admin, now)
  return json({ people: profiles.length, results })
})
