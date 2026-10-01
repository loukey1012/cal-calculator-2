import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const TEST_PASSWORD = 'integration-test-Pa55word!'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing ${name} — see .env.test.local`)
  return value
}

const url = requireEnv('SUPABASE_TEST_URL')
const anonKey = requireEnv('SUPABASE_TEST_ANON_KEY')
const serviceRoleKey = requireEnv('SUPABASE_TEST_SERVICE_ROLE_KEY')

// Integration tests create and delete users: refuse to run against the app's own (prod) project.
if (
  process.env.VITE_SUPABASE_URL &&
  new URL(url).host === new URL(process.env.VITE_SUPABASE_URL).host
) {
  throw new Error('SUPABASE_TEST_URL points at the production project — aborting')
}

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } }

export const admin = createClient(url, serviceRoleKey, clientOptions)

export function anonClient(): SupabaseClient {
  return createClient(url, anonKey, clientOptions)
}

export type TestUser = {
  readonly id: string
  readonly email: string
  readonly client: SupabaseClient
}

export async function createTestUser(label: string): Promise<TestUser> {
  const email = `test-${label}-${crypto.randomUUID()}@example.com`
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: label },
  })
  if (error || !data.user) throw new Error(`createUser(${label}) failed: ${error?.message}`)

  const client = anonClient()
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password: TEST_PASSWORD,
  })
  if (signInError) throw new Error(`signIn(${label}) failed: ${signInError.message}`)

  return { id: data.user.id, email, client }
}

export async function deleteTestUsers(users: readonly TestUser[]): Promise<void> {
  const householdIds = new Set<string>()
  for (const user of users) {
    const { data } = await admin.from('profiles').select('household_id').eq('id', user.id).single()
    if (data?.household_id) householdIds.add(data.household_id)
  }
  for (const user of users) {
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) throw new Error(`deleteUser failed: ${error.message}`)
  }
  if (householdIds.size > 0) {
    const { error } = await admin
      .from('households')
      .delete()
      .in('id', [...householdIds])
    if (error) throw new Error(`household cleanup failed: ${error.message}`)
  }
}
