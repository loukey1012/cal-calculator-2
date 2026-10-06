import { activePage, expect, logIn, test } from './backend.ts'
import { addIngredient, cookFor } from './cook.ts'

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
  await cookFor(today, page, /Lunch/)
  await addIngredient(page, 'Skyr', '500')
  await activePage(page).getByRole('button', { name: 'Save meal' }).click()

  const goals = today.getByRole('list', { name: 'Goals' })
  await expect(goals).toContainText('315 / 2,000 kcal')
  await expect(goals).toContainText('55.0 / 120 g')

  await today.getByRole('radio', { name: 'baby' }).click()
  await expect(today.getByText('baby hasn’t set a daily goal yet.')).toBeVisible()
  // her empty breakfast opens Cook for her
  await cookFor(today, page, /Breakfast/)
  await expect(activePage(page).getByRole('button', { name: 'baby', pressed: true })).toBeVisible()
  await addIngredient(page, 'Haferflocken', '60')
  await activePage(page).getByRole('button', { name: 'Save meal' }).click()
  await expect(today.getByRole('button', { name: /Breakfast/ })).toContainText('224 kcal')

  await expect
    .poll(async () => {
      const { data } = await backend.admin
        .from('meals')
        .select('meal_type')
        .eq('user_id', partner.id)
      return data
    })
    .toEqual([{ meal_type: 'breakfast' }])
})
