import { activePage, expect, localDay, logIn, test } from './backend.ts'
import { addIngredient, cookFor } from './cook.ts'

test('log a meal on Cook: from the database and as a custom item, then change and delete', async ({
  page,
  backend,
}) => {
  const me = await backend.user('Mia')
  const household = await backend.household([me])
  await backend.admin.from('ingredients').insert([
    { household_id: household, name: 'Skyr', kcal_100: 63, protein_100: 11 },
    {
      household_id: household,
      name: 'Protein Riegel',
      kcal_unit: 210,
      unit_label: 'Riegel',
      unit_weight_g: 60,
    },
  ])
  await logIn(page, me)
  const sheet = page.getByRole('dialog')

  // an empty meal opens Cook for it
  await cookFor(activePage(page), page, /Lunch/)
  const cook = activePage(page)
  await expect(cook.getByRole('radio', { name: 'Lunch' })).toBeChecked()
  await cook.getByRole('button', { name: 'Add ingredient' }).click()
  await cook.getByRole('button', { name: /Skyr/ }).click()
  await cook.getByLabel('Amount').fill('200')
  await expect(cook.getByTestId('line-preview')).toContainText('126 kcal')
  await cook.getByRole('button', { name: 'Add to dish' }).click()

  await cook.getByRole('button', { name: 'Add ingredient' }).click()
  await cook.getByRole('button', { name: /Protein Riegel/ }).click()
  await cook.getByRole('radio', { name: 'Riegel' }).click()
  await cook.getByLabel('Amount').fill('2')
  await cook.getByRole('button', { name: 'Add to dish' }).click()

  await cook.getByRole('button', { name: 'Add ingredient' }).click()
  await cook.getByRole('button', { name: /Custom item/ }).click()
  await cook.getByLabel('Name', { exact: true }).fill('Croissant')
  await cook.getByRole('radio', { name: 'Per unit' }).click()
  await cook.getByLabel('Calories').fill('231,2')
  await cook.getByLabel('Amount').fill('1')
  await cook.getByRole('button', { name: 'Add to dish' }).click()
  // 126 + 420 + 232 (rounded up)
  await expect(cook.getByTestId('dish-totals')).toContainText('778 kcal')
  await cook.getByRole('button', { name: 'Save meal' }).click()

  // back on Today: the meal is one dish
  const today = activePage(page)
  await expect(today.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible()
  await expect(today.getByRole('button', { name: /Lunch/ })).toContainText('778 kcal · 1 item')

  await today.getByRole('button', { name: /Lunch/ }).click()
  await sheet.getByRole('button', { name: /Skyr, Protein Riegel \+1/ }).click()
  await sheet.getByRole('button', { name: 'Edit dish' }).click()
  await sheet.getByRole('button', { name: /Skyr/ }).click()
  await sheet.getByLabel('Amount').fill('100')
  await sheet.getByRole('button', { name: 'Save', exact: true }).click()
  await sheet.getByRole('button', { name: /Protein Riegel/ }).click()
  await sheet.getByRole('button', { name: 'Remove from dish' }).click()
  await sheet.getByRole('button', { name: 'Save dish' }).click()
  await expect(sheet.getByTestId('meal-total')).toContainText('295 kcal')
  await sheet.getByRole('button', { name: 'Close' }).click()
  // wait until every change reached the server ("Saving" may not even have appeared yet)
  await expect
    .poll(async () => {
      const { data } = await backend.admin
        .from('meal_items')
        .select('name, entered_amount, meals!inner(user_id)')
        .eq('meals.user_id', me.id)
        .order('name')
      return data?.map((item) => `${item.name} ${item.entered_amount}`)
    })
    .toEqual(['Croissant 1', 'Skyr 100'])

  await page.reload()
  await expect(activePage(page).getByRole('button', { name: /Lunch/ })).toContainText('295 kcal')
  const { data } = await backend.admin
    .from('meals')
    .select('date, meal_type, meal_items(name)')
    .eq('user_id', me.id)
  expect(data).toEqual([
    {
      date: localDay(),
      meal_type: 'lunch',
      meal_items: expect.arrayContaining([{ name: 'Skyr' }, { name: 'Croissant' }]),
    },
  ])
})

test('a single food logged alone shows like an item, changes in place and is removed', async ({
  page,
  backend,
}) => {
  const me = await backend.user('Mia')
  const household = await backend.household([me])
  await backend.admin
    .from('ingredients')
    .insert({ household_id: household, name: 'Apple', kcal_100: 52 })
  await logIn(page, me)
  const sheet = page.getByRole('dialog')

  await page.getByRole('navigation', { name: 'Tabs' }).getByRole('button', { name: 'Cook' }).click()
  await activePage(page).getByRole('radio', { name: 'Snacks' }).click()
  await addIngredient(page, 'Apple', '150')
  await activePage(page).getByRole('button', { name: 'Save meal' }).click()

  const today = activePage(page)
  await today.getByRole('button', { name: /Snacks/ }).click()
  await sheet.getByRole('button', { name: /Apple.*150 g.*78 kcal/ }).click()
  await sheet.getByLabel('Amount').fill('300')
  await sheet.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(sheet.getByTestId('meal-total')).toContainText('156 kcal')
  await sheet.getByRole('button', { name: /Apple/ }).click()
  await sheet.getByRole('button', { name: 'Remove from Snacks' }).click()
  await expect(sheet.getByText('Nothing logged yet.')).toBeVisible()

  await expect
    .poll(async () => {
      const { data } = await backend.admin.from('dishes').select('id').eq('household_id', household)
      return data?.length
    })
    .toBe(0)
})
