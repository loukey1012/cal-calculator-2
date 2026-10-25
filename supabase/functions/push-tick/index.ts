import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { json } from '../_shared/http.ts'
import { parseNotificationSettings } from '../_shared/notificationSettings.ts'
import {
  isQuiet,
  isRecentFinding,
  isUnsavedDue,
  localNow,
  partnerChangeMessage,
  partnerName,
  plannedByClock,
  reminderMessage,
  reviewMessage,
  summaryMessage,
  unsavedDishMessage,
  type MealType,
  type Planned,
  type PushMessage,
} from '../_shared/schedule.ts'
import { sendToAll, type Subscription } from '../_shared/sendPush.ts'

/**
 * Runs every 5 minutes (pg_cron → pg_net, see the notification_schedule migration) and sends
 * what is due for everyone with a phone that has notifications on: meal reminders, the day
 * summary, the partner's changes, a dish left in Add food and new weekly review findings. Only
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

async function summaryFor(admin: SupabaseClient, userId: string, date: string) {
  const day = await admin
    .from('daily_totals')
    .select('kcal, protein, carbs, fat, meal_count, cheat_day, cheat_meal, kcal_estimated')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle()
  if (day.error) throw new Error(`daily_totals: ${day.error.message}`)
  if (!day.data || (day.data.meal_count ?? 0) === 0) return null
  const goal = await admin
    .from('goal_history')
    .select('kcal, protein_g, carbs_g, fat_g')
    .eq('user_id', userId)
    .lte('valid_from', date)
    .order('valid_from', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (goal.error) throw new Error(`goal_history: ${goal.error.message}`)
  return {
    day: {
      date,
      kcal: day.data.kcal ?? 0,
      protein: day.data.protein,
      carbs: day.data.carbs,
      fat: day.data.fat,
      mealCount: day.data.meal_count ?? 0,
      cheatDay: day.data.cheat_day === true,
      cheatMeal: day.data.cheat_meal === true,
      kcalEstimated: day.data.kcal_estimated === true,
    },
    goal: goal.data
      ? {
          kcal: goal.data.kcal,
          protein: goal.data.protein_g,
          carbs: goal.data.carbs_g,
          fat: goal.data.fat_g,
        }
      : null,
  }
}

async function timedMessages(
  admin: SupabaseClient,
  profile: Profile,
  planned: readonly Planned[],
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
    } else {
      const summary = await summaryFor(admin, profile.id, item.date)
      if (!summary) continue
      outgoing.push({
        kind: 'summary',
        key: item.key,
        message: summaryMessage(summary.day, summary.goal, settings.summary.day),
      })
    }
  }
  return outgoing
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
    .select('actor_id, date, meal_type, changed_at')
    .eq('user_id', profile.id)
  if (error) throw new Error(`partner_changes: ${error.message}`)
  if (data.length === 0) return []
  if (
    settings.partnerChanges &&
    !isQuiet(
      data.map((row) => row.changed_at),
      now,
    )
  )
    return []

  const latest =
    data
      .map((row) => row.changed_at)
      .toSorted()
      .at(-1) ?? ''
  const cleared = await admin
    .from('partner_changes')
    .delete()
    .eq('user_id', profile.id)
    .lte('changed_at', latest)
  if (cleared.error) throw new Error(`partner_changes: ${cleared.error.message}`)
  if (!settings.partnerChanges) return []

  const actors = [...new Set(data.map((row) => row.actor_id))]
  return actors.map((actorId) => ({
    kind: 'partner',
    key: `${actorId}:${latest}`,
    message: partnerChangeMessage(
      partnerName(profile.appearance, actorId),
      data
        .filter((row) => row.actor_id === actorId)
        .map((row) => ({ date: row.date, mealType: row.meal_type })),
      today,
    ),
  }))
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

async function tickFor(
  admin: SupabaseClient,
  profile: Profile,
  subscriptions: readonly Subscription[],
  now: Date,
): Promise<number> {
  const local = localNow(now, profile.time_zone)
  const settings = parseNotificationSettings(profile.notification_settings)
  const outgoing = [
    ...(await timedMessages(admin, profile, plannedByClock(settings, local))),
    ...(await partnerMessages(admin, profile, local.date, now)),
    ...(await unsavedMessages(admin, profile, now)),
    ...(await reviewMessages(admin, profile, now)),
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
          .select('id, household_id, appearance, notification_preferences(settings, time_zone)')
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
