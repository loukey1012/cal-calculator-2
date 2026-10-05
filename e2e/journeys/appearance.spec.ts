import { activePage, expect, logIn, test } from './backend.ts'

test('the chosen look is saved to the account and follows the user to a new device', async ({
  page,
  browser,
  backend,
}) => {
  const me = await backend.user('Lukas')
  await backend.household([me])
  await logIn(page, me)

  await page.getByRole('button', { name: 'Settings' }).click()
  await activePage(page)
    .getByRole('button', { name: /Appearance/ })
    .click()
  const settings = activePage(page)
  await settings.getByRole('button', { name: /App colors/ }).click()
  await settings.getByRole('radio', { name: 'Dark', exact: true }).click()
  await settings.getByRole('radio', { name: /Graphite/ }).click()
  await settings.getByRole('radio', { name: 'Lime' }).click()
  await settings.getByRole('button', { name: 'Appearance' }).click()
  await settings.getByRole('button', { name: /Progress/ }).click()
  await settings.getByRole('radio', { name: 'Bars', exact: true }).click()

  const html = page.locator('html')
  await expect(html).toHaveAttribute('data-scheme', 'bento')
  await expect
    .poll(() => html.evaluate((root) => root.style.getPropertyValue('--accent')))
    .toBe('#c6f432')
  await expect
    .poll(async () => {
      const { data } = await backend.admin
        .from('profiles')
        .select('appearance, accent_color')
        .eq('id', me.id)
        .single()
      return data
    })
    .toMatchObject({
      accent_color: '#c6f432',
      appearance: { theme: 'dark', darkStyle: 'bento', progressStyle: 'bars' },
    })

  // a fresh browser has nothing cached: the look comes from the account alone
  const otherDevice = await browser.newContext()
  const otherPage = await otherDevice.newPage()
  await logIn(otherPage, me)
  await expect(otherPage.locator('html')).toHaveAttribute('data-scheme', 'bento')
  await otherDevice.close()
})

test('the pink light style paints the app pink and is kept across a restart', async ({
  page,
  backend,
}) => {
  const me = await backend.user('Anna')
  await backend.household([me])
  await logIn(page, me)

  await page.getByRole('button', { name: 'Settings' }).click()
  await activePage(page)
    .getByRole('button', { name: /Appearance/ })
    .click()
  const settings = activePage(page)
  await settings.getByRole('button', { name: /App colors/ }).click()
  await settings.getByRole('radio', { name: 'Light', exact: true }).click()
  await settings.getByRole('radio', { name: /Pink/ }).first().click()

  const html = page.locator('html')
  await expect(html).toHaveAttribute('data-scheme', 'pink')
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(251, 237, 243)')
  await expect
    .poll(async () => {
      const { data } = await backend.admin
        .from('profiles')
        .select('appearance')
        .eq('id', me.id)
        .single()
      return data?.appearance
    })
    .toMatchObject({ theme: 'light', lightStyle: 'pink' })

  await page.reload()
  await expect(html).toHaveAttribute('data-scheme', 'pink')
})

test('each ring can get its own color', async ({ page, backend }) => {
  const me = await backend.user('Anna')
  await backend.household([me])
  await logIn(page, me)

  await page.getByRole('button', { name: 'Settings' }).click()
  await activePage(page)
    .getByRole('button', { name: /Appearance/ })
    .click()
  const settings = activePage(page)
  await settings.getByRole('button', { name: /Progress/ }).click()
  await settings
    .getByRole('list', { name: 'Ring colors' })
    .getByRole('button', { name: /Protein/ })
    .click()
  await page
    .getByRole('dialog', { name: 'Protein color' })
    .getByRole('radio', { name: 'Lavender' })
    .click()

  await expect
    .poll(() =>
      page.locator('html').evaluate((root) => root.style.getPropertyValue('--goal-protein')),
    )
    .toBe('#9466d6')
  await expect
    .poll(async () => {
      const { data } = await backend.admin
        .from('profiles')
        .select('appearance')
        .eq('id', me.id)
        .single()
      return data?.appearance
    })
    .toMatchObject({ customGoalColors: { protein: '#9466d6' } })
})
