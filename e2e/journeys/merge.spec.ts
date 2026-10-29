import { activePage, expect, localDay, logIn, test } from './backend.ts'

test('two duplicates merged by hand from the edit sheet: the meal follows the kept one', async ({
  page,
  backend,
}) => {
  const me = await backend.user('Mara')
  const household = await backend.household([me])
  const categoryId = await backend.category(household)
  const { data: ingredients } = await backend.admin
    .from('ingredients')
    .insert([
      { household_id: household, category_id: categoryId, name: 'Pfanni Püree', kcal_100: 350 },
      { household_id: household, category_id: categoryId, name: 'Kartoffelpüree', kcal_100: 340 },
    ])
    .select('id, name')
  const idOf = (name: string) => ingredients?.find((row) => row.name === name)?.id ?? ''
  const { data: meal } = await backend.admin
    .from('meals')
    .insert({ user_id: me.id, date: localDay(1), meal_type: 'lunch' })
    .select('id')
    .single()
  await backend.admin.from('meal_items').insert({
    meal_id: meal?.id,
    ingredient_id: idOf('Kartoffelpüree'),
    name: 'Kartoffelpüree',
    entered_amount: 100,
    entered_unit: 'g',
    basis: 'per_100g',
    basis_multiplier: 1,
    kcal: 340,
  })
  await logIn(page, me)
  await page
    .getByRole('navigation', { name: 'Tabs' })
    .getByRole('button', { name: 'Ingredients' })
    .click()

  await activePage(page)
    .getByRole('button', { name: /Pfanni Püree/ })
    .click()
  const sheet = page.getByRole('dialog')
  await sheet.getByRole('button', { name: 'Merge with…' }).click()
  // the ingredient itself is not offered
  await expect(sheet.getByRole('button', { name: /Pfanni Püree/ })).toHaveCount(0)
  await sheet.getByRole('button', { name: /Kartoffelpüree/ }).click()
  await expect(sheet.getByRole('button', { name: /Not duplicates/ })).toHaveCount(0)
  await sheet.getByRole('button', { name: /^Keep Pfanni Püree/ }).click()
  await sheet.getByRole('button', { name: 'Merge into Pfanni Püree' }).click()

  await expect(sheet).toBeHidden()
  await expect(page.getByText('Merged into Pfanni Püree.')).toBeVisible()
  await expect
    .poll(async () => {
      const { data: left } = await backend.admin
        .from('ingredients')
        .select('name')
        .eq('household_id', household)
      const { data: item } = await backend.admin
        .from('meal_items')
        .select('ingredient_id, kcal')
        .eq('meal_id', meal?.id ?? '')
      return { left, item }
    })
    .toEqual({
      left: [{ name: 'Pfanni Püree' }],
      item: [{ ingredient_id: idOf('Pfanni Püree'), kcal: 340 }],
    })
})
