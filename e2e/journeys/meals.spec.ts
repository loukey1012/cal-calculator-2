import { activePage, expect, localDay, logIn, test } from './backend.ts'

test('log a meal: add from the database and as a custom item, change an amount, delete', async ({
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
  const today = activePage(page)
  const sheet = page.getByRole('dialog')

  await today.getByRole('button', { name: /Lunch/ }).click()
  await sheet.getByRole('button', { name: 'Add food' }).click()
  await sheet.getByRole('button', { name: /Skyr/ }).click()
  await sheet.getByLabel('Amount').fill('200')
  await expect(sheet.getByTestId('amount-preview')).toContainText('126 kcal')
  await sheet.getByRole('button', { name: 'Add to Lunch' }).click()

  await sheet.getByRole('button', { name: 'Add food' }).click()
  await sheet.getByRole('button', { name: /Protein Riegel/ }).click()
  await sheet.getByRole('radio', { name: 'Riegel' }).click()
  await sheet.getByLabel('Amount').fill('2')
  await sheet.getByRole('button', { name: 'Add to Lunch' }).click()

  await sheet.getByRole('button', { name: 'Add food' }).click()
  await sheet.getByRole('button', { name: /Custom item/ }).click()
  await sheet.getByLabel('Name', { exact: true }).fill('Croissant')
  await sheet.getByRole('radio', { name: 'Per unit' }).click()
  await sheet.getByLabel('Calories').fill('231,2')
  await sheet.getByLabel('Amount').fill('1')
  await sheet.getByRole('button', { name: 'Add to Lunch' }).click()
  // 126 + 420 + 232 (rounded up)
  await expect(sheet.getByTestId('meal-total')).toContainText('778 kcal')

  await sheet.getByRole('button', { name: /Skyr/ }).click()
  await sheet.getByLabel('Amount').fill('100')
  await sheet.getByRole('button', { name: 'Save' }).click()
  await sheet.getByRole('button', { name: /Protein Riegel/ }).click()
  await sheet.getByRole('button', { name: 'Remove from Lunch' }).click()
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
  expect(data?.[0]?.meal_items).toHaveLength(2)
})
