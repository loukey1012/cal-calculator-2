import { activePage, expect, localDay, logIn, test } from './backend.ts'
import { addIngredient, backToDay, cookFor, openAddFood } from './cook.ts'

test('log a meal on Cook: from the database and as a custom item, then change and delete', async ({
  page,
  backend,
}) => {
  const me = await backend.user('Mia')
  const household = await backend.household([me])
  await backend.admin.from('ingredients').insert([
    {
      household_id: household,
      category_id: await backend.category(household),
      name: 'Skyr',
      kcal_100: 63,
      protein_100: 11,
    },
    {
      household_id: household,
      category_id: await backend.category(household),
      name: 'Protein Riegel',
      kcal_unit: 210,
      unit_label: 'Riegel',
      unit_weight_g: 60,
    },
  ])
  await logIn(page, me)
  // a meal opens as a page of its own
  const sheet = activePage(page)

  // an empty meal opens its Add food
  await cookFor(activePage(page), page, /Lunch/)
  const cook = activePage(page)
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
  await cook.getByRole('button', { name: 'Custom item' }).click()
  await cook.getByLabel('Name', { exact: true }).fill('Croissant')
  await cook.getByRole('radio', { name: 'Per unit' }).click()
  await cook.getByLabel('Calories').fill('231,2')
  await cook.getByLabel('Amount').fill('1')
  await cook.getByRole('button', { name: 'Add to dish' }).click()
  // 126 + 420 + 232 (rounded up)
  await expect(cook.getByTestId('dish-totals')).toContainText('778 kcal')
  await cook.getByRole('button', { name: 'Save meal' }).click()
  await backToDay(page)

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
  await backToDay(page)
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
  await backend.admin.from('ingredients').insert({
    household_id: household,
    category_id: await backend.category(household),
    name: 'Apple',
    kcal_100: 52,
  })
  await logIn(page, me)

  await openAddFood(page, /Snacks/)
  await addIngredient(page, 'Apple', '150')
  await activePage(page).getByRole('button', { name: 'Save meal' }).click()

  // saving leads to the meal's page
  const sheet = activePage(page)
  await expect(sheet.getByRole('heading', { level: 1, name: 'Snacks' })).toBeVisible()
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

test('a meal eaten out is logged as an estimate and the day shows ~', async ({ page, backend }) => {
  const me = await backend.user('Mia')
  const household = await backend.household([me])
  await logIn(page, me)

  await cookFor(activePage(page), page, /Dinner/)
  const cook = activePage(page)
  await cook.getByRole('button', { name: 'Add ingredient' }).click()
  await cook.getByRole('button', { name: 'Custom item' }).click()
  await cook.getByLabel('Name', { exact: true }).fill('Pizza')
  await cook.getByRole('radio', { name: 'Per unit' }).click()
  await cook.getByLabel('Calories').fill('900')
  await cook.getByLabel('Amount').fill('1')
  await cook.getByRole('button', { name: 'Add to dish' }).click()
  await cook.getByRole('switch', { name: 'Calories are an estimate' }).click()
  await expect(cook.getByTestId('dish-totals')).toContainText('~900 kcal')
  await cook.getByRole('button', { name: 'Save meal' }).click()
  await backToDay(page)

  const today = activePage(page)
  await expect(today.getByRole('button', { name: /Dinner/ })).toContainText('~900 kcal · 1 item')
  await expect
    .poll(async () => {
      const { data } = await backend.admin
        .from('dishes')
        .select('kcal_estimated')
        .eq('household_id', household)
      return data
    })
    .toEqual([{ kcal_estimated: true }])

  await page.reload()
  const reloaded = activePage(page)
  await expect(reloaded.getByRole('button', { name: /Dinner/ })).toContainText('~900 kcal')
  await reloaded.getByRole('button', { name: /Dinner/ }).click()
  await expect(
    activePage(page).getByRole('button', { name: /Pizza.*Estimate · 1 unit.*~900 kcal/ }),
  ).toBeVisible()
})

test('a logged meal is moved to another meal; the dish stays one', async ({ page, backend }) => {
  const me = await backend.user('Mo')
  const household = await backend.household([me])
  await backend.admin.from('ingredients').insert({
    household_id: household,
    category_id: await backend.category(household),
    name: 'Skyr',
    kcal_100: 63,
  })
  await logIn(page, me)

  await cookFor(activePage(page), page, /Lunch/)
  await addIngredient(page, 'Skyr', '200')
  await activePage(page).getByRole('button', { name: 'Save meal' }).click()
  const meal = activePage(page)
  await meal.getByRole('button', { name: 'Move to…' }).click()
  await meal.getByRole('radio', { name: 'Dinner' }).click()
  await meal.getByRole('button', { name: 'Move' }).click()
  await expect(meal.getByRole('status')).toContainText('Moved to Dinner')

  await expect
    .poll(async () => {
      const { data } = await backend.admin
        .from('meal_items')
        .select('name, meals!inner(user_id, meal_type)')
        .eq('meals.user_id', me.id)
      return data?.map((item) => (item.meals as unknown as { meal_type: string }).meal_type)
    })
    .toEqual(['dinner'])
  const { count } = await backend.admin
    .from('dishes')
    .select('id', { count: 'exact', head: true })
    .eq('household_id', household)
  expect(count).toBe(1)
})
