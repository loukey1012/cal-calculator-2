import { activePage, expect, logIn, test } from './backend.ts'

test('set a goal, see the rings, and log a meal for the partner', async ({ page, backend }) => {
  const me = await backend.user('Lukas')
  const partner = await backend.user('Anna')
  const household = await backend.household([me, partner])
  await backend.admin.from('ingredients').insert([
    { household_id: household, name: 'Skyr', kcal_100: 63, protein_100: 11, carbs_100: 4 },
    { household_id: household, name: 'Haferflocken', kcal_100: 372, protein_100: 13.5 },
  ])
  await logIn(page, me)
  const today = activePage(page)
  const sheet = page.getByRole('dialog')

  await today.getByRole('button', { name: 'Set goal' }).click()
  await sheet.getByLabel('Calories').fill('2000')
  await sheet.getByLabel('Protein').fill('120')
  await sheet.getByRole('button', { name: 'Save' }).click()
  await today.getByRole('button', { name: /Lunch/ }).click()
  await sheet.getByRole('button', { name: 'Add food' }).click()
  await sheet.getByRole('button', { name: /Skyr/ }).click()
  await sheet.getByLabel('Amount').fill('500')
  await sheet.getByRole('button', { name: 'Add to Lunch' }).click()
  await sheet.getByRole('button', { name: 'Close' }).click()

  const goals = today.getByRole('list', { name: 'Goals' })
  await expect(goals).toContainText('315 / 2,000 kcal')
  await expect(goals).toContainText('55.0 / 120 g')

  await today.getByRole('radio', { name: 'baby' }).click()
  await expect(today.getByText('baby hasn’t set a daily goal yet.')).toBeVisible()
  await today.getByRole('button', { name: /Breakfast/ }).click()
  await sheet.getByRole('button', { name: 'Add food' }).click()
  await sheet.getByRole('button', { name: /Haferflocken/ }).click()
  await sheet.getByLabel('Amount').fill('60')
  await sheet.getByRole('button', { name: 'Add to Breakfast' }).click()
  await sheet.getByRole('button', { name: 'Close' }).click()
  await expect(today.getByRole('button', { name: /Breakfast/ })).toContainText('224 kcal')

  const { data } = await backend.admin.from('meals').select('meal_type').eq('user_id', partner.id)
  expect(data).toEqual([{ meal_type: 'breakfast' }])
})
