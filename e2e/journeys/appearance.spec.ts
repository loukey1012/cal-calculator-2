import { activePage, expect, localDay, logIn, test } from './backend.ts'

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

test('the accent can be White (with a thin edge on light cards) or any custom color', async ({
  page,
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
  const html = page.locator('html')
  const variable = (name: string) =>
    html.evaluate((root, key) => root.style.getPropertyValue(key), name)

  await settings.getByRole('radio', { name: 'White', exact: true }).click()
  await expect.poll(() => variable('--accent')).toBe('#ffffff')
  await expect.poll(() => variable('--accent-edge')).not.toBe('transparent')

  // the system color picker sets the input's value and closes
  await settings.getByLabel('Custom color').fill('#123456')
  await settings.getByRole('button', { name: 'Use this color' }).click()
  await expect.poll(() => variable('--accent')).toBe('#123456')
  await expect.poll(() => variable('--accent-edge')).toBe('transparent')
  await expect
    .poll(async () => {
      const { data } = await backend.admin
        .from('profiles')
        .select('accent_color')
        .eq('id', me.id)
        .single()
      return data?.accent_color
    })
    .toBe('#123456')
})

test('Liquid Glass: Minimal for every field, Full for everything, kept across a restart', async ({
  page,
  backend,
}) => {
  const me = await backend.user('Lena')
  await backend.household([me])
  await backend.admin
    .from('goal_history')
    .insert({ user_id: me.id, valid_from: localDay(30), kcal: 2000 })
  await logIn(page, me)
  const html = page.locator('html')
  const tabs = page.getByRole('navigation', { name: 'Tabs' })
  const today = activePage(page)
  const progressCard = today
    .getByRole('list', { name: 'Goals' })
    .locator('xpath=ancestor::section[1]')
  const mealCard = today.getByRole('button', { name: /Breakfast/ })
  await expect(progressCard).toBeVisible()
  await expect(mealCard).toHaveCSS('backdrop-filter', 'none')

  await tabs.getByRole('button', { name: 'Settings' }).click()
  await activePage(page)
    .getByRole('button', { name: /Appearance/ })
    .click()
  const settings = activePage(page)
  await settings.getByRole('button', { name: /App colors/ }).click()
  await settings.getByRole('radio', { name: 'Dark', exact: true }).click()
  await settings.getByRole('radio', { name: 'Minimal' }).click()

  // Minimal: the tab bar and every field are glass, the dark style stays
  await expect(html).toHaveAttribute('data-glass', 'controls')
  await expect(html).toHaveAttribute('data-scheme', 'soft')
  await expect(tabs.getByRole('list')).toHaveCSS('backdrop-filter', /blur\(22px\)/)
  await expect(settings.getByRole('radiogroup', { name: 'Theme' })).toHaveCSS(
    'backdrop-filter',
    /blur/,
  )
  await tabs.getByRole('button', { name: 'Today' }).click()
  await expect(mealCard).toHaveCSS('backdrop-filter', /blur/)
  // only the big progress card stays solid
  await expect(progressCard).toHaveCSS('backdrop-filter', 'none')

  // Full: the progress card too
  // the Settings tab opens at its start again
  await tabs.getByRole('button', { name: 'Settings' }).click()
  await settings.getByRole('button', { name: /Appearance/ }).click()
  await settings.getByRole('button', { name: /App colors/ }).click()
  await settings.getByRole('radio', { name: 'Full' }).click()
  await expect(html).toHaveAttribute('data-glass', 'all')
  await tabs.getByRole('button', { name: 'Today' }).click()
  await expect(progressCard).toHaveCSS('backdrop-filter', /blur/)
  await expect
    .poll(async () => {
      const { data } = await backend.admin
        .from('profiles')
        .select('appearance')
        .eq('id', me.id)
        .single()
      return data?.appearance
    })
    .toMatchObject({ theme: 'dark', glass: 'all' })

  await page.reload()
  await expect(html).toHaveAttribute('data-glass', 'all')
})

test('the background behind Full: random colors change with the tab, spots move, saved to the account', async ({
  page,
  backend,
}) => {
  const me = await backend.user('Nora')
  await backend.household([me])
  await backend.admin
    .from('profiles')
    .update({ appearance: { glass: 'all' } })
    .eq('id', me.id)
  await logIn(page, me)
  const html = page.locator('html')
  const firstSpot = () => html.evaluate((root) => root.style.getPropertyValue('--gf-c1'))
  const tabs = page.getByRole('navigation', { name: 'Tabs' })
  // the style colors to begin with
  await expect.poll(firstSpot).toBe('var(--goal-kcal)')

  await tabs.getByRole('button', { name: 'Settings' }).click()
  const settings = activePage(page)
  await settings.getByRole('button', { name: /Appearance/ }).click()
  await settings.getByRole('button', { name: /Background/ }).click()
  const group = (name: string) => settings.getByRole('radiogroup', { name })
  await group('Colors').getByRole('radio', { name: 'Random' }).click()
  await expect.poll(firstSpot).toMatch(/^#[0-9a-f]{6}$/)
  await group('Position').getByRole('radio', { name: 'Moving' }).click()
  await expect(html).toHaveAttribute('data-glass-moving', 'medium')

  const before = await firstSpot()
  await tabs.getByRole('button', { name: 'Today' }).click()
  await expect.poll(firstSpot).not.toBe(before)
  await expect
    .poll(async () => {
      const { data } = await backend.admin
        .from('profiles')
        .select('appearance')
        .eq('id', me.id)
        .single()
      return data?.appearance
    })
    .toMatchObject({
      glass: 'all',
      glassField: {
        position: { mode: 'moving', speed: 'medium' },
        colors: { mode: 'random', changeOn: 'tab' },
      },
    })
})
