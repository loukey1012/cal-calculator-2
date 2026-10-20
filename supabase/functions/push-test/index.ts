import { createClient } from 'npm:@supabase/supabase-js@2'
import { CORS_HEADERS, json } from '../_shared/http.ts'
import { sendToAll } from '../_shared/sendPush.ts'

/**
 * Settings › Notifications › Send test notification: a push to every phone of the signed-in
 * person. Answers how many phones got it ({ sent, removed, failed }).
 */

const TEST_MESSAGE = {
  title: 'Test notification',
  body: 'Notifications from CALculator arrive on this phone.',
  url: '/settings/notifications',
  tag: 'test',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (request.method !== 'POST') return json({ error: 'Use POST' }, 405)

  const url = Deno.env.get('SUPABASE_URL') ?? ''
  const asCaller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: request.headers.get('Authorization') ?? '' } },
  })
  const { data: caller, error: authError } = await asCaller.auth.getUser()
  if (authError || !caller.user) return json({ error: 'Not signed in' }, 401)

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
  const { data: subscriptions, error } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', caller.user.id)
  if (error) {
    console.error('could not load subscriptions', error.message)
    return json({ error: 'Could not load your phones' }, 500)
  }
  return json(await sendToAll(admin, subscriptions, TEST_MESSAGE))
})
