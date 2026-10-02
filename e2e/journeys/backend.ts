import { expect, test as base, type Page } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Journeys run the real app against the DEV Supabase project. Every test gets its own
 * throwaway users and household, deleted afterwards. Never runs against production.
 */
const testUrl = process.env.SUPABASE_TEST_URL
const serviceKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY
const appUrl = process.env.VITE_SUPABASE_URL
export const hasDevBackend = Boolean(
  testUrl && serviceKey && appUrl && new URL(appUrl).host === new URL(testUrl).host,
)

const PASSWORD = 'journey-test-Pa55word!'

export type JourneyUser = { readonly id: string; readonly email: string; readonly name: string }

export class DevBackend {
  readonly admin: SupabaseClient
  private readonly userIds: string[] = []
  private readonly householdIds: string[] = []

  constructor() {
    this.admin = createClient(testUrl ?? '', serviceKey ?? '', { auth: { persistSession: false } })
  }

  async user(name: string): Promise<JourneyUser> {
    const email = `journey-${name.toLowerCase()}-${crypto.randomUUID()}@example.com`
    const { data, error } = await this.admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: name },
    })
    if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`)
    this.userIds.push(data.user.id)
    return { id: data.user.id, email, name }
  }

  /** An established household with these members, before anyone opens the app. */
  async household(members: readonly JourneyUser[]): Promise<string> {
    const { data, error } = await this.admin
      .from('households')
      .insert({ name: 'Journey Home' })
      .select('id')
      .single()
    if (error) throw new Error(`household failed: ${error.message}`)
    this.householdIds.push(data.id)
    await this.admin
      .from('profiles')
      .update({ household_id: data.id })
      .in(
        'id',
        members.map((m) => m.id),
      )
    return data.id
  }

  async cleanup(): Promise<void> {
    for (const id of this.userIds) await this.admin.auth.admin.deleteUser(id)
    if (this.householdIds.length)
      await this.admin.from('households').delete().in('id', this.householdIds)
  }
}

export const test = base.extend<{ backend: DevBackend }>({
  // Playwright requires the destructuring pattern for fixtures, even when empty
  // oxlint-disable-next-line no-empty-pattern
  backend: async ({}, provide) => {
    const backend = new DevBackend()
    await provide(backend)
    await backend.cleanup()
  },
})

test.skip(!hasDevBackend, 'needs SUPABASE_TEST_* and an app built against the dev project')

export { expect }

export async function logIn(page: Page, user: JourneyUser): Promise<void> {
  await page.goto('/')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page.getByRole('navigation', { name: 'Tabs' })).toBeVisible({ timeout: 30_000 })
}

/** The visible tab page (the others are inert). */
export function activePage(page: Page) {
  return page.locator('[data-testid="tab-page"]:not([inert])')
}

export function localDay(daysAgo = 0): string {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
