import type { SupabaseClient } from '@supabase/supabase-js'
import { activePage, expect, localDay, logIn, test } from './backend.ts'
import { addFromRecipe, addIngredient, openAddFood } from './addFood.ts'

/** name → amount of one person's items in a meal of today, as stored on the server */
async function loggedItems(admin: SupabaseClient, userId: string, mealType: string) {
  const { data } = await admin
    .from('meal_items')
    .select('name, entered_amount, kcal, meals!inner(user_id, date, meal_type)')
    .eq('meals.user_id', userId)
    .eq('meals.date', localDay())
    .eq('meals.meal_type', mealType)
    .order('name')
  return data?.map((item) => `${item.name} ${item.entered_amount} (${item.kcal})`) ?? []
}

test('a dish saved as a recipe is cooked again at the ingredient’s new values', async ({
  page,
  backend,
}) => {
  const me = await backend.user('Lukas')
  const partner = await backend.user('Lisa')
  const household = await backend.household([me, partner])
  const { data: patty } = await backend.admin
    .from('ingredients')
    .insert({
      household_id: household,
      category_id: await backend.category(household),
      name: 'Patty',
      kcal_100: 240,
    })
    .select('id')
    .single()
  await logIn(page, me)

  // burgers for both, saved as a recipe before logging lunch
  await openAddFood(page, /Lunch/)
  const cook = activePage(page)
  await cook.getByRole('button', { name: 'baby', pressed: false }).click()
  await addIngredient(page, 'Patty', '300')
  await cook.getByRole('button', { name: 'Save as recipe' }).click()
  const sheet = page.getByRole('dialog', { name: 'Save as recipe' })
  await sheet.getByLabel('Recipe name').fill('Burgers')
  await sheet.getByRole('button', { name: 'Save recipe' }).click()
  await expect(sheet).toBeHidden()
  await cook.getByRole('button', { name: 'Save meal' }).click()
  await expect
    .poll(() => loggedItems(backend.admin, partner.id, 'lunch'))
    .toEqual(['Patty 150 (240)'])

  // the patty gets leaner; dinner is the recipe again
  await backend.admin
    .from('ingredients')
    .update({ kcal_100: 200 })
    .eq('id', patty?.id ?? '')
  await addFromRecipe(page, /Dinner/)
  await activePage(page)
    .getByRole('button', { name: /Burgers/ })
    .click()
  await expect(activePage(page).getByRole('heading', { name: 'Burgers' })).toBeVisible()
  await activePage(page).getByRole('button', { name: 'Cook this' }).click()
  const again = activePage(page)
  await expect(again.getByRole('button', { name: 'baby', pressed: true })).toBeVisible()
  // 300 g at 200 kcal per 100 g, halved (the old value would give 360 each)
  await expect(again.getByTestId('dish-totals')).toContainText(/Lukas.*300 kcal.*baby.*300 kcal/)
  await again.getByRole('button', { name: 'Save meal' }).click()

  await expect.poll(() => loggedItems(backend.admin, me.id, 'dinner')).toEqual(['Patty 150 (200)'])
  await expect
    .poll(() => loggedItems(backend.admin, partner.id, 'dinner'))
    .toEqual(['Patty 150 (200)'])
})

test('a logged meal is copied to another meal and saved as a recipe', async ({ page, backend }) => {
  const me = await backend.user('Lukas')
  const partner = await backend.user('Lisa')
  const household = await backend.household([me, partner])
  await backend.admin.from('ingredients').insert([
    {
      household_id: household,
      category_id: await backend.category(household),
      name: 'Toast',
      kcal_100: 260,
    },
    {
      household_id: household,
      category_id: await backend.category(household),
      name: 'Jam',
      kcal_100: 250,
    },
  ])
  await logIn(page, me)

  await openAddFood(page, /Breakfast/)
  const cook = activePage(page)
  await addIngredient(page, 'Toast', '60')
  await addIngredient(page, 'Jam', '20')
  await cook.getByRole('button', { name: 'Save meal' }).click()

  // the same breakfast for her, as a snack (saving led to the breakfast's page)
  const sheet = activePage(page)
  await sheet.getByRole('button', { name: 'Copy to…' }).click()
  await sheet.getByRole('radio', { name: /baby/ }).click()
  await sheet.getByRole('radio', { name: 'Snacks' }).click()
  await sheet.getByRole('button', { name: 'Copy meal' }).click()
  await expect(sheet.getByRole('status')).toContainText('for baby')
  await expect
    .poll(() => loggedItems(backend.admin, partner.id, 'snack'))
    .toEqual(['Jam 20 (250)', 'Toast 60 (260)'])

  // and kept as a recipe
  await sheet.getByRole('button', { name: 'Save as recipe' }).click()
  await sheet.getByLabel('Recipe name').fill('Jam toast')
  await sheet.getByRole('button', { name: 'Save recipe' }).click()
  await expect(sheet.getByRole('status')).toContainText('Saved as a recipe')
  await expect
    .poll(async () => {
      const { data } = await backend.admin
        .from('recipes')
        .select('name, recipe_lines(name)')
        .eq('household_id', household)
      return data?.map((recipe) => [recipe.name, recipe.recipe_lines.length])
    })
    .toEqual([['Jam toast', 2]])
})

test('a recipe learns a swapped product and offers both next time', async ({ page, backend }) => {
  const me = await backend.user('Lukas')
  const household = await backend.household([me])
  const { data: fridge } = await backend.admin
    .from('category_groups')
    .insert({ household_id: household, name: 'Fridge' })
    .select('id')
    .single()
  const { data: dairy } = await backend.admin
    .from('categories')
    .insert({ household_id: household, name: 'Cheese', group_id: fridge?.id })
    .select('id')
    .single()
  await backend.admin.from('ingredients').insert([
    {
      household_id: household,
      category_id: await backend.category(household),
      name: 'Toastbrot',
      kcal_100: 260,
    },
    {
      household_id: household,
      name: 'Gouda',
      brand: 'Billa',
      kcal_100: 350,
      category_id: dairy?.id,
    },
    {
      household_id: household,
      name: 'Edamer',
      brand: 'Spar',
      kcal_100: 330,
      category_id: dairy?.id,
    },
  ])
  await logIn(page, me)

  // toast with Gouda, kept as a recipe and logged
  await openAddFood(page)
  const cook = activePage(page)
  await addIngredient(page, 'Toastbrot', '60')
  await addIngredient(page, 'Gouda', '30')
  await cook.getByRole('button', { name: 'Save as recipe' }).click()
  const sheet = page.getByRole('dialog', { name: 'Save as recipe' })
  await sheet.getByLabel('Recipe name').fill('Toast')
  await sheet.getByRole('button', { name: 'Save recipe' }).click()
  await expect(sheet).toBeHidden()
  await cook.getByRole('button', { name: 'Save meal' }).click()

  // next time with Edamer: swapped on Cook, then logged
  await addFromRecipe(page)
  await activePage(page)
    .getByRole('button', { name: /^Toast \d+ ingredients/ })
    .click()
  await activePage(page).getByRole('button', { name: 'Cook this' }).click()
  const again = activePage(page)
  await again.getByRole('button', { name: /^Gouda/ }).click()
  await again.getByRole('button', { name: 'Swap ingredient' }).click()
  await activePage(page)
    .getByRole('button', { name: /Edamer/ })
    .click()
  await expect(activePage(page).getByRole('button', { name: /Edamer/ })).toContainText('30 g')
  await activePage(page).getByRole('button', { name: 'Save meal' }).click()

  await expect
    .poll(async () => {
      const { data } = await backend.admin
        .from('recipe_lines')
        .select('name, picked, recipes!inner(household_id)')
        .eq('recipes.household_id', household)
        .order('position')
      return data?.map((line) => `${line.name}${line.picked ? ' (last time)' : ''}`)
    })
    .toEqual(['Toastbrot (last time)', 'Gouda', 'Edamer (last time)'])

  // the third time Cook offers both cheeses, Edamer first
  await addFromRecipe(page)
  await activePage(page)
    .getByRole('button', { name: /^Toast \d+ ingredients/ })
    .click()
  await activePage(page).getByRole('button', { name: 'Cook this' }).click()
  const third = activePage(page).getByRole('radiogroup', { name: 'Edamer: product' })
  await expect(third.getByRole('radio', { name: 'Edamer (Spar)' })).toBeChecked()
  await third.getByRole('radio', { name: 'Gouda (Billa)' }).click()
  await expect(activePage(page).getByRole('button', { name: /^Gouda/ })).toBeVisible()
})
