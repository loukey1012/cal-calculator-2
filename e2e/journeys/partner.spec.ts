import { activePage, expect, logIn, test } from './backend.ts'

test('give the partner a nickname and an emoji, kept after a reload', async ({ page, backend }) => {
  const me = await backend.user('Lukas')
  const partner = await backend.user('Lisa')
  await backend.household([me, partner])
  await logIn(page, me)

  // until changed, the partner is "baby" with a heart
  const today = activePage(page)
  await expect(today.getByRole('radio', { name: 'baby' })).toBeVisible()

  await page.getByRole('button', { name: 'Settings' }).click()
  const settings = activePage(page)
  await settings.getByRole('button', { name: /baby/ }).click()
  const nickname = settings.getByLabel('Nickname')
  await nickname.fill('Schatz')
  await nickname.press('Enter')
  await settings.getByRole('radio', { name: 'Bunny' }).click()
  await settings.getByRole('radio', { name: 'Periwinkle' }).click()
  await expect(settings.getByTestId('partner-preview')).toHaveText(/🐰\s*Schatz/)

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
      partnerLooks: { [partner.id]: { nickname: 'Schatz', symbol: '🐰', color: '#a78bfa' } },
    })

  await page.reload()
  await page.getByRole('button', { name: 'Today' }).click()
  await expect(activePage(page).getByRole('radio', { name: 'Schatz' })).toBeVisible()
  // her own account name is unchanged
  const { data } = await backend.admin
    .from('profiles')
    .select('display_name')
    .eq('id', partner.id)
    .single()
  expect(data?.display_name).toBe('Lisa')
})

test('pick a symbol for yourself, only on your account, kept after a reload', async ({
  page,
  backend,
}) => {
  const me = await backend.user('Lukas')
  const partner = await backend.user('Lisa')
  await backend.household([me, partner])
  await logIn(page, me)

  await page
    .getByRole('navigation', { name: 'Tabs' })
    .getByRole('button', { name: 'Settings' })
    .click()
  const settings = activePage(page)
  await settings.getByRole('button', { name: /^Symbol/ }).click()
  await settings.getByRole('radio', { name: 'Pink heart' }).click()
  await expect(settings.getByTestId('own-look-preview')).toHaveText(/🩷\s*Lukas/)

  await expect
    .poll(async () => {
      const { data } = await backend.admin
        .from('profiles')
        .select('id, appearance')
        .in('id', [me.id, partner.id])
      return Object.fromEntries(
        (data ?? []).map((row) => [
          row.id,
          (row.appearance as { ownLook?: unknown }).ownLook ?? null,
        ]),
      )
    })
    .toEqual({ [me.id]: { symbol: '🩷' }, [partner.id]: null })

  // the reload keeps the page; back to Settings with its own back button
  await page.reload()
  await activePage(page).getByRole('button', { name: 'Settings' }).click()
  await expect(activePage(page).getByRole('button', { name: /Lukas \(you\)/ })).toContainText('🩷')
})
