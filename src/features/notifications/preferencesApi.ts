import { ApiError } from '../../lib/errors'
import { supabase } from '../../lib/supabase'
import {
  parseNotificationSettings,
  type NotificationSettings,
} from '../../../supabase/functions/_shared/notificationSettings.ts'

/** What I want to be notified about, and the clock it follows (only I can see them). */
export type Preferences = {
  readonly settings: NotificationSettings
  /** IANA name, e.g. Europe/Vienna; null until a phone saved it */
  readonly timeZone: string | null
}

export async function fetchPreferences(userId: string): Promise<Preferences> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('settings, time_zone')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw ApiError.from(error)
  return {
    settings: parseNotificationSettings(data?.settings ?? {}),
    timeZone: data?.time_zone ?? null,
  }
}

export async function savePreferences(userId: string, preferences: Preferences): Promise<void> {
  const { error } = await supabase.from('notification_preferences').upsert({
    user_id: userId,
    settings: preferences.settings,
    time_zone: preferences.timeZone,
  })
  if (error) throw ApiError.from(error)
}

/** The phone's time zone, e.g. Europe/Vienna; null if the browser doesn't say. */
export function deviceTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null
  } catch {
    return null
  }
}
