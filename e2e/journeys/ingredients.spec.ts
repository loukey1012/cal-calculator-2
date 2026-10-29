import { activePage, expect, logIn, pickBasics, test } from './backend.ts'

test('add an ingredient in a new category of a broad category; find, edit and delete it; its empty category goes with it', async ({
  page,
  backend,
}) => {
  const me = await backend.user('Ingrid')
  const household = await backend.household([me])
  const { data: group } = await backend.admin
    .from('category_groups')
    .insert({ household_id: household, name: 'Dairy & Spreads' })
    .select('id')
    .single()
  await logIn(page, me)
  await page
    .getByRole('navigation', { name: 'Tabs' })
    .getByRole('button', { name: 'Ingredients' })
    .click()
  const ingredients = activePage(page)
  const sheet = page.getByRole('dialog')

  await ingredients.getByRole('button', { name: 'Add ingredient' }).click()
  await sheet.getByLabel('Name', { exact: true }).fill('Käse gerieben')
  await sheet.getByLabel('Broad category').selectOption({ label: 'Dairy & Spreads' })
  await sheet.getByLabel('Category', { exact: true }).selectOption({ label: 'New category…' })
  await sheet.getByLabel('New category name').fill('Dairy')
  await sheet.getByRole('switch', { name: 'Per 100 g' }).click()
  await sheet.getByLabel('Calories per 100 g').fill('350,4')
  await sheet.getByRole('button', { name: 'Save' }).click()
  await expect(sheet).toBeHidden()

  const { data: dairy } = await backend.admin
    .from('categories')
    .select('group_id')
    .eq('household_id', household)
    .eq('name', 'Dairy')
    .single()
  expect(dairy).toEqual({ group_id: group?.id })

  await ingredients.getByRole('searchbox', { name: 'Search ingredients' }).fill('kase')
  await expect(ingredients.getByRole('button', { name: /Käse gerieben/ })).toContainText(
    '351 kcal / 100 g',
  )

  await ingredients.getByRole('button', { name: /Käse gerieben/ }).click()
  await sheet.getByLabel('Name', { exact: true }).fill('Käse gerieben (Gouda)')
  await sheet.getByRole('button', { name: 'Save' }).click()
  await expect(ingredients.getByRole('button', { name: /Gouda/ })).toBeVisible()

  page.once('dialog', (dialog) => void dialog.accept())
  await ingredients.getByRole('button', { name: /Gouda/ }).click()
  await sheet.getByRole('button', { name: 'Delete Ingredient' }).click()
  await expect(ingredients.getByText('No ingredients yet')).toBeVisible()

  const { count } = await backend.admin
    .from('categories')
    .select('id', { count: 'exact', head: true })
    .eq('household_id', household)
  expect(count).toBe(0)
})

test('a new ingredient takes a saved brand from the suggestions', async ({ page, backend }) => {
  const me = await backend.user('Ingrid')
  const household = await backend.household([me])
  await backend.admin.from('ingredients').insert({
    household_id: household,
    category_id: await backend.category(household),
    name: 'Milch',
    brand: 'Clever',
    kcal_100: 64,
  })
  await logIn(page, me)
  await page
    .getByRole('navigation', { name: 'Tabs' })
    .getByRole('button', { name: 'Ingredients' })
    .click()
  const sheet = page.getByRole('dialog')

  await activePage(page).getByRole('button', { name: 'Add ingredient' }).click()
  await sheet.getByLabel('Name', { exact: true }).fill('Joghurt')
  await sheet.getByRole('combobox', { name: 'Brand' }).pressSequentially('cl')
  await sheet.getByRole('option', { name: 'Clever' }).click()
  await expect(sheet.getByRole('combobox', { name: 'Brand' })).toHaveValue('Clever')
  await sheet.getByRole('switch', { name: 'Per 100 g' }).click()
  await sheet.getByLabel('Calories per 100 g').fill('59')
  await pickBasics(sheet)
  await sheet.getByRole('button', { name: 'Save' }).click()
  await expect(sheet).toBeHidden()

  await expect
    .poll(async () => {
      const { data } = await backend.admin
        .from('ingredients')
        .select('name, brand')
        .eq('household_id', household)
        .eq('name', 'Joghurt')
      return data
    })
    .toEqual([{ name: 'Joghurt', brand: 'Clever' }])
})

test('diet marks: switched on in the form, shown in the list, filtered by the chips', async ({
  page,
  backend,
}) => {
  const me = await backend.user('Ingrid')
  const household = await backend.household([me])
  const category_id = await backend.category(household)
  // every row names the same columns: a batch insert fills a missing one with null, not its default
  const seeded = await backend.admin.from('ingredients').insert([
    {
      household_id: household,
      category_id,
      name: 'Hafer',
      kcal_100: 370,
      vegan: true,
      halal: false,
    },
    {
      household_id: household,
      category_id,
      name: 'Salami',
      kcal_100: 400,
      vegan: false,
      halal: false,
    },
  ])
  expect(seeded.error).toBeNull()
  await logIn(page, me)
  await page
    .getByRole('navigation', { name: 'Tabs' })
    .getByRole('button', { name: 'Ingredients' })
    .click()
  const ingredients = activePage(page)
  const sheet = page.getByRole('dialog')

  await expect(
    ingredients.getByRole('button', { name: /^Hafer/ }).getByRole('img', { name: 'vegan' }),
  ).toBeVisible()
  await expect(ingredients.getByRole('button', { name: /^Salami/ }).getByRole('img')).toHaveCount(0)

  await ingredients.getByRole('button', { name: 'Salami' }).click()
  await sheet.getByRole('switch', { name: 'Halal' }).click()
  await sheet.getByRole('button', { name: 'Save' }).click()
  await expect(sheet).toBeHidden()
  await expect(
    ingredients.getByRole('button', { name: /^Salami/ }).getByRole('img', { name: 'halal' }),
  ).toBeVisible()

  await ingredients.getByRole('button', { name: 'Vegan', exact: true }).click()
  await expect(ingredients.getByRole('button', { name: /Hafer/ })).toBeVisible()
  await expect(ingredients.getByRole('button', { name: /Salami/ })).toBeHidden()
  await ingredients.getByRole('button', { name: 'Vegan', exact: true }).click()
  await ingredients.getByRole('button', { name: 'Halal', exact: true }).click()
  await expect(ingredients.getByRole('button', { name: /Salami/ })).toBeVisible()
  await expect(ingredients.getByRole('button', { name: /Hafer/ })).toBeHidden()
})
