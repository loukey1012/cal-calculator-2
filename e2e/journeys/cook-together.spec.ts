import { activePage, expect, localDay, logIn, test } from './backend.ts'

/** name → amount of one person's items in a meal, as stored on the server */
async function loggedItems(
  admin: import('@supabase/supabase-js').SupabaseClient,
  userId: string,
  mealType: string,
) {
  const { data } = await admin
    .from('meal_items')
    .select('name, entered_amount, dish_portion_id, meals!inner(user_id, date, meal_type)')
    .eq('meals.user_id', userId)
    .eq('meals.date', localDay())
    .eq('meals.meal_type', mealType)
    .order('name')
  return data?.map((item) => `${item.name} ${item.entered_amount}`) ?? []
}

test('cook together: one dish logged for both, edited, and a meal shared afterwards', async ({
  page,
  backend,
}) => {
  const me = await backend.user('Lukas')
  const partner = await backend.user('Lisa')
  const household = await backend.household([me, partner])
  await backend.admin.from('ingredients').insert([
    { household_id: household, name: 'Patty', kcal_100: 240 },
    { household_id: household, name: 'Tomato', kcal_100: 18 },
    { household_id: household, name: 'Skyr', kcal_100: 63 },
  ])
  await logIn(page, me)
  const sheet = page.getByRole('dialog')

  // a burger: shared patty, tomato only for her
  await activePage(page).getByRole('button', { name: /Lunch/ }).click()
  await sheet.getByRole('button', { name: 'Cook together' }).click()
  await expect(sheet.getByRole('combobox', { name: 'baby' })).toHaveValue('lunch')
  await sheet.getByLabel('Dish name (optional)').fill('Burger')
  await sheet.getByRole('button', { name: 'Add ingredient' }).click()
  await sheet.getByRole('button', { name: /Patty/ }).click()
  await sheet.getByLabel('Amount').fill('250')
  await sheet.getByRole('button', { name: 'Add to dish' }).click()
  await sheet.getByRole('button', { name: 'Add ingredient' }).click()
  await sheet.getByRole('button', { name: /Tomato/ }).click()
  await sheet.getByRole('radio', { name: 'Only baby' }).click()
  await sheet.getByLabel('Amount').fill('20')
  await sheet.getByRole('button', { name: 'Add to dish' }).click()
  await expect(sheet.getByTestId('dish-totals')).toContainText('300 kcal')
  await sheet.getByRole('button', { name: 'Save dish' }).click()
  await expect(sheet.getByRole('button', { name: /Burger.*300 kcal/ })).toBeVisible()

  await expect.poll(() => loggedItems(backend.admin, me.id, 'lunch')).toEqual(['Patty 125'])
  await expect
    .poll(() => loggedItems(backend.admin, partner.id, 'lunch'))
    .toEqual(['Patty 125', 'Tomato 20'])

  // more patty: both portions follow
  await sheet.getByRole('button', { name: /Burger/ }).click()
  await sheet.getByRole('button', { name: 'Edit dish' }).click()
  await sheet.getByRole('button', { name: /Patty/ }).click()
  await sheet.getByLabel('Amount').fill('300')
  await sheet.getByRole('button', { name: 'Save', exact: true }).click()
  await sheet.getByRole('button', { name: 'Save dish' }).click()
  await expect
    .poll(() => loggedItems(backend.admin, partner.id, 'lunch'))
    .toEqual(['Patty 150', 'Tomato 20'])
  await sheet.getByRole('button', { name: 'Close' }).click()

  // dinner logged alone, then shared
  await activePage(page)
    .getByRole('button', { name: /Dinner/ })
    .click()
  await sheet.getByRole('button', { name: 'Add food' }).click()
  await sheet.getByRole('button', { name: /Skyr/ }).click()
  await sheet.getByLabel('Amount').fill('400')
  await sheet.getByRole('button', { name: 'Add to Dinner' }).click()
  await sheet.getByRole('button', { name: 'Share this meal' }).click()
  await sheet.getByRole('button', { name: 'Save dish' }).click()

  await expect.poll(() => loggedItems(backend.admin, me.id, 'dinner')).toEqual(['Skyr 200'])
  await expect.poll(() => loggedItems(backend.admin, partner.id, 'dinner')).toEqual(['Skyr 200'])
  // the Today card counts the dish as one item
  await sheet.getByRole('button', { name: 'Close' }).click()
  await expect(activePage(page).getByRole('button', { name: /Lunch/ })).toContainText('1 item')
})

test('leftovers: cook a portion more, see it on Today, eat it later', async ({ page, backend }) => {
  const me = await backend.user('Lukas')
  const partner = await backend.user('Lisa')
  const household = await backend.household([me, partner])
  await backend.admin
    .from('ingredients')
    .insert({ household_id: household, name: 'Chili', kcal_100: 150 })
  await logIn(page, me)
  const sheet = page.getByRole('dialog')

  await activePage(page)
    .getByRole('button', { name: /Dinner/ })
    .click()
  await sheet.getByRole('button', { name: 'Cook together' }).click()
  await sheet.getByLabel('Dish name (optional)').fill('Chili')
  await sheet.getByRole('button', { name: 'More leftover portions' }).click()
  await sheet.getByRole('button', { name: 'Add ingredient' }).click()
  await sheet.getByRole('button', { name: /Chili/ }).click()
  await sheet.getByLabel('Amount').fill('1200')
  await sheet.getByRole('button', { name: 'Add to dish' }).click()
  await expect(sheet.getByTestId('dish-totals')).toContainText(/Leftover.*600 kcal/)
  await sheet.getByRole('button', { name: 'Save dish' }).click()
  await sheet.getByRole('button', { name: 'Close' }).click()

  // the leftover shows on Today; eat it for lunch
  await activePage(page).getByRole('button', { name: 'Chili left' }).click()
  const leftovers = page.getByRole('dialog', { name: 'Leftovers' })
  await leftovers.getByRole('button', { name: /Chili.*600 kcal/ }).click()
  await leftovers.getByRole('button', { name: 'Add to Lunch' }).click()
  await expect(activePage(page).getByRole('button', { name: 'Chili left' })).toBeHidden()

  await expect
    .poll(async () => {
      const { data } = await backend.admin
        .from('meal_items')
        .select('entered_amount, meals!inner(user_id, meal_type)')
        .eq('meals.user_id', me.id)
        .order('entered_amount')
      // one meal per item (inner join), typed as a list by supabase-js
      return data?.map((item) => {
        const meal = item.meals as unknown as { meal_type: string }
        return `${meal.meal_type} ${item.entered_amount}`
      })
    })
    .toEqual(expect.arrayContaining(['dinner 400', 'lunch 400']))
  await expect(activePage(page).getByRole('button', { name: /Lunch/ })).toContainText('600 kcal')
})
