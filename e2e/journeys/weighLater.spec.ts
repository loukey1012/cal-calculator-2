import { activePage, expect, localDay, logIn, test } from './backend.ts'
import { addIngredient, addToEmptyMeal } from './addFood.ts'

test('weigh later: an ingredient added without an amount blocks saving until it is weighed', async ({
  page,
  backend,
}) => {
  const me = await backend.user('Lukas')
  const household = await backend.household([me])
  const categoryId = await backend.category(household)
  await backend.admin.from('ingredients').insert([
    { household_id: household, category_id: categoryId, name: 'Rice', kcal_100: 130 },
    { household_id: household, category_id: categoryId, name: 'Salmon', kcal_100: 200 },
  ])
  await logIn(page, me)

  await addToEmptyMeal(activePage(page), page, /Dinner/)
  const cook = activePage(page)
  await addIngredient(page, 'Rice', '200')

  // the second ingredient goes in without an amount
  await cook.getByRole('button', { name: 'Add ingredient' }).click()
  await cook.getByRole('button', { name: /Salmon/ }).click()
  await cook.getByRole('button', { name: 'Weigh later' }).click()
  const salmonRow = cook.getByRole('button', { name: 'Salmon, to weigh' })
  await expect(salmonRow).toBeVisible()
  await expect(cook.getByTestId('dish-totals')).toContainText('260 kcal')

  // saving is blocked until it is weighed
  await expect(cook.getByText('Weigh 1 ingredient first')).toBeHidden()
  await cook.getByRole('button', { name: 'Save meal' }).click()
  await expect(cook.getByRole('heading', { level: 1, name: 'Add food' })).toBeVisible()
  await expect(cook.getByText('Weigh 1 ingredient first')).toBeVisible()

  // weigh it
  await salmonRow.click()
  await cook.getByLabel('Amount').fill('150')
  await cook.getByRole('button', { name: 'Add to dish' }).click()
  await expect(cook.getByText('To weigh')).toBeHidden()
  await expect(cook.getByText('Weigh 1 ingredient first')).toBeHidden()
  await expect(cook.getByTestId('dish-totals')).toContainText('560 kcal')

  await cook.getByRole('button', { name: 'Save meal' }).click()

  await expect
    .poll(async () => {
      const { data } = await backend.admin
        .from('meal_items')
        .select('name, entered_amount, meals!inner(user_id, date, meal_type)')
        .eq('meals.user_id', me.id)
        .eq('meals.date', localDay())
        .eq('meals.meal_type', 'dinner')
        .order('name')
      return data?.map((item) => `${item.name} ${item.entered_amount}`) ?? []
    })
    .toEqual(['Rice 200', 'Salmon 150'])
})
