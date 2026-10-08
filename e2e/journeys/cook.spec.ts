import { activePage, expect, localDay, logIn, test } from './backend.ts'
import { addIngredient, cookFor } from './cook.ts'

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

function openCook(page: import('@playwright/test').Page) {
  return page
    .getByRole('navigation', { name: 'Tabs' })
    .getByRole('button', { name: 'Cook' })
    .click()
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
  await openCook(page)
  const cook = activePage(page)
  await cook.getByRole('button', { name: 'baby', pressed: false }).click()
  await cook.getByRole('radio', { name: 'Lunch' }).click()
  await cook.getByLabel('Dish name (optional)').fill('Burger')
  await addIngredient(page, 'Patty', '250')
  await cook.getByRole('button', { name: 'Add ingredient' }).click()
  await cook.getByRole('button', { name: /Tomato/ }).click()
  await cook.getByRole('radio', { name: 'Only baby' }).click()
  await cook.getByLabel('Amount').fill('20')
  await cook.getByRole('button', { name: 'Add to dish' }).click()
  await expect(cook.getByTestId('dish-totals')).toContainText('300 kcal')
  await cook.getByRole('button', { name: 'Save meal' }).click()

  const today = activePage(page)
  await expect(today.getByRole('button', { name: /Lunch/ })).toContainText('1 item')
  await expect.poll(() => loggedItems(backend.admin, me.id, 'lunch')).toEqual(['Patty 125'])
  await expect
    .poll(() => loggedItems(backend.admin, partner.id, 'lunch'))
    .toEqual(['Patty 125', 'Tomato 20'])

  // more patty: both portions follow
  await today.getByRole('button', { name: /Lunch/ }).click()
  await sheet.getByRole('button', { name: /Burger.*Shared/ }).click()
  await sheet.getByRole('button', { name: 'Edit dish' }).click()
  await sheet.getByRole('button', { name: /Patty/ }).click()
  await sheet.getByLabel('Amount').fill('300')
  await sheet.getByRole('button', { name: 'Save', exact: true }).click()
  await sheet.getByRole('button', { name: 'Save dish' }).click()
  await expect
    .poll(() => loggedItems(backend.admin, partner.id, 'lunch'))
    .toEqual(['Patty 150', 'Tomato 20'])
  await sheet.getByRole('button', { name: 'Close' }).click()

  // dinner logged alone, then shared with her afterwards
  await cookFor(activePage(page), page, /Dinner/)
  await addIngredient(page, 'Skyr', '400')
  await activePage(page).getByRole('button', { name: 'Save meal' }).click()
  await activePage(page)
    .getByRole('button', { name: /Dinner/ })
    .click()
  await sheet.getByRole('button', { name: /Skyr.*400 g/ }).click()
  await sheet.getByRole('button', { name: 'Edit dish' }).click()
  await sheet.getByRole('combobox', { name: 'baby' }).selectOption('dinner')
  await sheet.getByRole('button', { name: 'Save dish' }).click()

  await expect.poll(() => loggedItems(backend.admin, me.id, 'dinner')).toEqual(['Skyr 200'])
  await expect.poll(() => loggedItems(backend.admin, partner.id, 'dinner')).toEqual(['Skyr 200'])
})

test('leftovers: cook a portion more, see it on Today, eat it later', async ({ page, backend }) => {
  const me = await backend.user('Lukas')
  const partner = await backend.user('Lisa')
  const household = await backend.household([me, partner])
  await backend.admin
    .from('ingredients')
    .insert({ household_id: household, name: 'Chili', kcal_100: 150 })
  await logIn(page, me)

  await cookFor(activePage(page), page, /Dinner/)
  const cook = activePage(page)
  await cook.getByLabel('Dish name (optional)').fill('Chili')
  await cook.getByRole('button', { name: 'More leftover portions' }).click()
  await addIngredient(page, 'Chili', '1200')
  await expect(cook.getByTestId('dish-totals')).toContainText(/Leftover.*900 kcal/)
  await cook.getByRole('button', { name: 'Save meal' }).click()

  // the leftover shows on Today and opens Cook, where it is eaten for lunch
  await activePage(page).getByRole('button', { name: 'Chili left' }).click()
  await activePage(page)
    .getByRole('button', { name: /Chili.*900 kcal/ })
    .click()
  const leftover = page.getByRole('dialog', { name: 'Chili' })
  await leftover.getByRole('radio', { name: 'Lunch' }).click()
  await leftover.getByRole('button', { name: 'Add to meal' }).click()
  await expect(activePage(page).getByRole('button', { name: /Chili.*900 kcal/ })).toBeHidden()

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
    .toEqual(expect.arrayContaining(['dinner 600', 'lunch 600']))
  await page
    .getByRole('navigation', { name: 'Tabs' })
    .getByRole('button', { name: 'Today' })
    .click()
  await expect(activePage(page).getByRole('button', { name: /Lunch/ })).toContainText('900 kcal')
})

/** A finger drag to the right across the visible page, as touch events (the back swipe). */
async function swipeBack(page: import('@playwright/test').Page) {
  // a swipe only starts once the page has stopped sliding
  await expect(activePage(page).getByTestId('stack-layer')).toHaveCount(1)
  await activePage(page).evaluate(async (target) => {
    const send = (type: string, x: number) => {
      const event = new Event(type, { bubbles: true, cancelable: true })
      const touches = type === 'touchend' ? [] : [{ clientX: x, clientY: 300 }]
      Object.defineProperty(event, 'touches', { value: touches })
      target.dispatchEvent(event)
    }
    send('touchstart', 20)
    for (const x of [60, 120, 180, 240]) {
      await new Promise((resolve) => setTimeout(resolve, 16))
      send('touchmove', x)
    }
    send('touchend', 240)
  })
}

test('adding an ingredient: Back and the back swipe go one step at a time', async ({
  page,
  backend,
}) => {
  const me = await backend.user('Lukas')
  const household = await backend.household([me])
  await backend.admin.from('ingredients').insert([
    { household_id: household, name: 'Patty', kcal_100: 240 },
    { household_id: household, name: 'Tomato', kcal_100: 18 },
  ])
  await logIn(page, me)
  await openCook(page)
  const cook = activePage(page)

  // the wrong ingredient picked: Back leads to the search, still filtered
  await cook.getByRole('button', { name: 'Add ingredient' }).click()
  await cook.getByLabel('Search ingredients').fill('pat')
  await cook.getByRole('button', { name: /Patty/ }).click()
  await expect(page).toHaveURL(/\/cook\/add\/[^/]+$/)
  await cook.getByRole('button', { name: 'Back' }).click()
  await expect(page).toHaveURL(/\/cook\/add$/)
  await expect(cook.getByLabel('Search ingredients')).toHaveValue('pat')

  // a swipe on the amount goes back to the search too, not to another tab
  await cook.getByRole('button', { name: /Patty/ }).click()
  await expect(cook.getByLabel('Amount')).toBeVisible()
  await swipeBack(page)
  await expect(page).toHaveURL(/\/cook\/add$/)
  await expect(cook.getByLabel('Search ingredients')).toBeVisible()

  // and from the search back to the dish
  await swipeBack(page)
  await expect(page).toHaveURL(/\/cook$/)
  await expect(cook.getByRole('button', { name: 'Add ingredient' })).toBeVisible()
  await addIngredient(page, 'Tomato', '50')
  await expect(page).toHaveURL(/\/cook$/)
  await expect(cook.getByRole('button', { name: /Tomato/ })).toBeVisible()
})

test('the Cook search: category chips, and a missing ingredient created right there', async ({
  page,
  backend,
}) => {
  const me = await backend.user('Lukas')
  const household = await backend.household([me])
  const { data: categories } = await backend.admin
    .from('categories')
    .insert([
      { household_id: household, name: 'Meat' },
      { household_id: household, name: 'Veggies' },
    ])
    .select('id, name')
  const categoryId = (name: string) => categories?.find((row) => row.name === name)?.id
  await backend.admin.from('ingredients').insert([
    { household_id: household, name: 'Patty', kcal_100: 240, category_id: categoryId('Meat') },
    { household_id: household, name: 'Tomato', kcal_100: 18, category_id: categoryId('Veggies') },
  ])
  await logIn(page, me)
  await openCook(page)
  const cook = activePage(page)
  await cook.getByRole('button', { name: 'Add ingredient' }).click()

  // the chips filter the search
  await cook
    .getByRole('group', { name: 'Categories' })
    .getByRole('button', { name: 'Veggies' })
    .click()
  await expect(cook.getByRole('button', { name: /Tomato/ })).toBeVisible()
  await expect(cook.getByRole('button', { name: /Patty/ })).toHaveCount(0)

  // not there yet: create it with the name searched for, then straight to its amount
  await cook.getByRole('group', { name: 'Categories' }).getByRole('button', { name: 'All' }).click()
  await cook.getByLabel('Search ingredients').fill('Feta')
  await expect(cook.getByText('No matches.')).toBeVisible()
  await cook.getByRole('button', { name: /New ingredient/ }).click()
  await expect(cook.getByLabel('Name', { exact: true })).toHaveValue('Feta')
  await cook.getByRole('switch', { name: 'Per 100 g' }).click()
  await cook.getByLabel('Calories per 100 g').fill('264')
  await cook.getByRole('button', { name: 'Save ingredient' }).click()
  await cook.getByLabel('Amount').fill('50')
  await cook.getByRole('button', { name: 'Add to dish' }).click()

  await expect(cook.getByRole('button', { name: /Feta.*132 kcal/ })).toBeVisible()
  const { data: saved } = await backend.admin
    .from('ingredients')
    .select('name, kcal_100')
    .eq('household_id', household)
    .eq('name', 'Feta')
  expect(saved).toEqual([{ name: 'Feta', kcal_100: 264 }])
})
