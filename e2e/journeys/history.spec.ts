import { activePage, expect, localDay, logIn, test } from './backend.ts'

test('open a past day in History and add a forgotten dinner', async ({ page, backend }) => {
  const me = await backend.user('Hanna')
  await backend.household([me])
  const yesterday = localDay(1)
  await backend.admin
    .from('goal_history')
    .insert({ user_id: me.id, valid_from: localDay(30), kcal: 2000 })
  const { data: meal } = await backend.admin
    .from('meals')
    .insert({ user_id: me.id, date: yesterday, meal_type: 'lunch' })
    .select('id')
    .single()
  await backend.admin.from('meal_items').insert({
    meal_id: meal?.id,
    name: 'Seeded lunch',
    entered_amount: 1,
    entered_unit: 'unit',
    basis: 'per_unit',
    basis_multiplier: 1,
    kcal: 1800,
  })
  await logIn(page, me)
  await page
    .getByRole('navigation', { name: 'Tabs' })
    .getByRole('button', { name: 'History' })
    .click()
  const history = activePage(page)
  // previous month if yesterday was the last day of it
  if (yesterday.slice(0, 7) !== localDay().slice(0, 7)) {
    await history.getByRole('button', { name: 'Previous month' }).click()
  }

  await history.getByRole('button', { name: /within goal/ }).click()
  await expect(page).toHaveURL(new RegExp(`/history/${yesterday}$`))
  await history.getByRole('button', { name: /Dinner/ }).click()
  const sheet = page.getByRole('dialog')
  await sheet.getByRole('button', { name: 'Add food' }).click()
  await sheet.getByRole('button', { name: /Custom item/ }).click()
  await sheet.getByLabel('Name', { exact: true }).fill('Forgotten pizza')
  await sheet.getByRole('radio', { name: 'Per unit' }).click()
  await sheet.getByLabel('Calories').fill('450')
  await sheet.getByLabel('Amount').fill('1')
  await sheet.getByRole('button', { name: 'Add to Dinner' }).click()
  await sheet.getByRole('button', { name: 'Close' }).click()
  await expect(history.getByTestId('day-total')).toContainText('2,250 kcal')

  await history.getByRole('button', { name: 'Back to History' }).click()
  await expect(history.getByRole('button', { name: /over goal/ })).toBeVisible()
  const { data } = await backend.admin
    .from('meals')
    .select('meal_type, meal_items(name)')
    .eq('user_id', me.id)
    .eq('date', yesterday)
    .eq('meal_type', 'dinner')
  expect(data).toEqual([{ meal_type: 'dinner', meal_items: [{ name: 'Forgotten pizza' }] }])
})
