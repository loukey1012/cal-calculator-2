import { expect, logIn, test } from './backend.ts'

const UPDATED = 'Updated to the latest version'
// the key in src/app/appVersion.ts
const VERSION_KEY = 'calculator.lastStartedVersion'

test('a new version says so on its first start only, and Settings shows which one runs', async ({
  page,
  backend,
}) => {
  const me = await backend.user('Lukas')
  await backend.household([me])

  // a first start on this phone says nothing
  await logIn(page, me)
  await expect(page.getByText(UPDATED)).toHaveCount(0)

  // the phone last ran an older version: the next start is the first on a new one
  await page.evaluate((key) => localStorage.setItem(key, 'an-older-version'), VERSION_KEY)
  await page.reload()
  await expect(page.getByRole('status').filter({ hasText: UPDATED })).toBeVisible()

  // the start after that says nothing again
  await page.reload()
  await expect(page.getByRole('navigation', { name: 'Tabs' })).toBeVisible()
  await expect(page.getByText(UPDATED)).toHaveCount(0)

  await page
    .getByRole('navigation', { name: 'Tabs' })
    .getByRole('button', { name: 'Settings' })
    .click()
  await expect(page.getByText(/^Version .+ · [0-9a-f]{7}$/)).toBeVisible()
})
