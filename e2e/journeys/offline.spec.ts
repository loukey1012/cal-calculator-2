import { activePage, expect, logIn, test } from './backend.ts'

test('a meal logged offline is kept and sent exactly once when back online', async ({
  page,
  context,
  backend,
  browserName,
}) => {
  const me = await backend.user('Otto')
  const household = await backend.household([me])
  await backend.admin
    .from('ingredients')
    .insert({ household_id: household, name: 'Skyr', kcal_100: 63 })
  await logIn(page, me)
  const today = activePage(page)
  const sheet = page.getByRole('dialog')
  await today.getByRole('button', { name: /Lunch/ }).click()
  await sheet.getByRole('button', { name: 'Add food' }).click()
  await sheet.getByRole('button', { name: /Skyr/ }).click()
  await sheet.getByLabel('Amount').fill('250')

  await context.setOffline(true)
  await sheet.getByRole('button', { name: 'Add to Lunch' }).click()
  await expect(sheet.getByRole('button', { name: /Skyr/ })).toContainText('158 kcal')
  await expect(
    page.getByRole('status').filter({ hasText: 'Offline · 1 change pending' }),
  ).toBeVisible()
  await sheet.getByRole('button', { name: 'Close' }).click()

  // closing and reopening the app offline needs the service worker (Chromium in Playwright)
  if (browserName === 'chromium') {
    await page.waitForTimeout(1000)
    await page.reload()
    await expect(activePage(page).getByRole('button', { name: /Lunch/ })).toContainText('158 kcal')
    await expect(
      page.getByRole('status').filter({ hasText: 'Offline · 1 change pending' }),
    ).toBeVisible()
  }

  await context.setOffline(false)
  await expect(page.getByRole('status').filter({ hasText: /Offline|Saving/ })).toHaveCount(0, {
    timeout: 20_000,
  })
  await expect
    .poll(async () => {
      // only this test's user: other journeys run in parallel on the same dev project
      const { data } = await backend.admin
        .from('meal_items')
        .select('id, meals!inner(user_id)')
        .eq('meals.user_id', me.id)
      return data?.length
    })
    .toBe(1)
})
