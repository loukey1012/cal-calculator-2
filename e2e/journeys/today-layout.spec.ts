import { activePage, expect, localDay, logIn, test } from './backend.ts'

// The user's iPhone as a home-screen app: 390×844 with a 47px status bar and the tab bar 20px
// above the edge. Playwright has no safe-area insets, so the viewport leaves out the status bar
// and the 4px the tab bar sits higher than its 16px fallback.
test.use({ viewport: { width: 390, height: 844 - 47 - 4 } })

test('the Today page fits the iPhone screen without scrolling', async ({ page, backend }) => {
  const me = await backend.user('Lukas')
  const partner = await backend.user('Anna')
  await backend.household([me, partner])
  // the tallest case: a partner to switch to and every goal set
  await backend.admin.from('goal_history').insert(
    [me, partner].map((person) => ({
      user_id: person.id,
      valid_from: localDay(),
      kcal: 2100,
      protein_g: 140,
      carbs_g: 230,
      fat_g: 70,
    })),
  )
  await logIn(page, me)
  const today = activePage(page)
  await expect(today.getByRole('list', { name: 'Goals' })).toBeVisible()
  await expect(today.getByRole('button', { name: /Snack/ })).toContainText('Nothing logged')

  const { scrollHeight, clientHeight } = await today.evaluate((element) => ({
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
  }))
  expect(scrollHeight).toBeLessThanOrEqual(clientHeight)

  const lastMeal = await today.getByRole('button', { name: /Snack/ }).boundingBox()
  const tabBar = await page.getByRole('navigation', { name: 'Tabs' }).boundingBox()
  expect(lastMeal!.y + lastMeal!.height).toBeLessThan(tabBar!.y)
})
