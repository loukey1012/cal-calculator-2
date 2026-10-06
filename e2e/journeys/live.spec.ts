import type { Page } from '@playwright/test'
import { activePage, expect, localDay, logIn, test, type DevBackend } from './backend.ts'

/** The partner logs a snack on another phone (straight into the database). */
async function partnerLogsSnack(backend: DevBackend, partnerId: string, name: string) {
  const { data: meal, error } = await backend.admin
    .from('meals')
    .upsert(
      { user_id: partnerId, date: localDay(), meal_type: 'snack' },
      { onConflict: 'user_id,date,meal_type' },
    )
    .select('id')
    .single()
  if (error) throw new Error(`meal failed: ${error.message}`)
  const item = await backend.admin.from('meal_items').insert({
    meal_id: meal.id,
    name,
    entered_amount: 100,
    entered_unit: 'g',
    basis: 'per_100g',
    basis_multiplier: 1,
    kcal: 321,
  })
  if (item.error) throw new Error(`item failed: ${item.error.message}`)
}

/** Playwright can't send a real app to the background: pretend iOS hid or showed it. */
async function setVisibility(page: Page, state: 'hidden' | 'visible') {
  // a string, run in the page: these files are typed without the browser's globals
  await page.evaluate(`
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => '${state}' })
    document.dispatchEvent(new Event('visibilitychange'))
  `)
}

test("a partner's new food shows up on Today without reloading", async ({ page, backend }) => {
  // Arrange: I'm looking at my partner's day
  const me = await backend.user('Lukas')
  const partner = await backend.user('Lisa')
  await backend.household([me, partner])
  await logIn(page, me)
  const today = activePage(page)
  await today.getByRole('radio', { name: 'baby' }).click()
  const snack = today.getByRole('button', { name: /Snack/ })
  await expect(snack).not.toContainText('321 kcal')
  // the app connects to the household's channel shortly after opening
  await page.waitForTimeout(2_000)

  // Act
  await partnerLogsSnack(backend, partner.id, 'Granola bar')

  // Assert
  await expect(snack).toContainText('321 kcal', { timeout: 10_000 })
})

test('changes made while the app was in the background show up when it comes back', async ({
  page,
  backend,
}) => {
  // Arrange
  const me = await backend.user('Lukas')
  const partner = await backend.user('Lisa')
  await backend.household([me, partner])
  await logIn(page, me)
  const today = activePage(page)
  await today.getByRole('radio', { name: 'baby' }).click()
  const snack = today.getByRole('button', { name: /Snack/ })
  await page.waitForTimeout(2_000)
  await setVisibility(page, 'hidden')

  // Act: she logs while my app is away, then I open it again
  await partnerLogsSnack(backend, partner.id, 'Apple pie')
  await setVisibility(page, 'visible')

  // Assert
  await expect(snack).toContainText('321 kcal', { timeout: 10_000 })
})
