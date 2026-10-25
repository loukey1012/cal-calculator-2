import { activePage, expect, localDay, logIn, test, type DevBackend } from './backend.ts'
import { addIngredient, backToDay, openAddFood } from './addFood.ts'

/** A plain portion of 200 g Skyr at 60 kcal / 100 g, logged for someone on a day. */
async function logSkyr(backend: DevBackend, userId: string, ingredientId: string, date: string) {
  const { data: meal } = await backend.admin
    .from('meals')
    .insert({ user_id: userId, date, meal_type: 'breakfast' })
    .select('id')
    .single()
  await backend.admin.from('meal_items').insert({
    meal_id: meal?.id,
    ingredient_id: ingredientId,
    name: 'Skyr',
    entered_amount: 200,
    entered_unit: 'g',
    basis: 'per_100g',
    basis_multiplier: 2,
    kcal: 60,
  })
}

test('editing an ingredient updates the last two weeks’ meals of both, not older ones', async ({
  page,
  backend,
}) => {
  // Arrange: Skyr in her breakfast today and three weeks ago
  const me = await backend.user('Ines')
  const partner = await backend.user('Jonas')
  const household = await backend.household([me, partner])
  const { data: skyr } = await backend.admin
    .from('ingredients')
    .insert({
      household_id: household,
      category_id: await backend.category(household),
      name: 'Skyr',
      kcal_100: 60,
    })
    .select('id')
    .single()
  const skyrId = skyr?.id ?? ''
  await logSkyr(backend, partner.id, skyrId, localDay())
  await logSkyr(backend, partner.id, skyrId, localDay(21))
  await logIn(page, me)
  const tabs = page.getByRole('navigation', { name: 'Tabs' })

  // and 100 g of it in a dish of mine today
  await openAddFood(page)
  const cook = activePage(page)
  await addIngredient(page, 'Skyr', '100')
  await cook.getByRole('button', { name: 'Save meal' }).click()
  await backToDay(page)
  await expect(activePage(page).getByRole('heading', { level: 1, name: 'Today' })).toBeVisible()
  await expect(activePage(page).getByText('60 kcal').first()).toBeVisible()

  // Act: Skyr has 80 kcal per 100 g after all
  await tabs.getByRole('button', { name: 'Ingredients' }).click()
  await activePage(page).getByRole('button', { name: /Skyr/ }).click()
  const sheet = page.getByRole('dialog')
  await sheet.getByRole('textbox', { name: 'Calories per 100 g' }).fill('80')
  await sheet.getByRole('button', { name: 'Save' }).click()

  // Assert
  await expect(page.getByText('Updated in 2 meals')).toBeVisible()
  // kcal of each logged food, oldest meal first
  const kcalOf = async (userId: string) => {
    const { data } = await backend.admin
      .from('meals')
      .select('date, meal_items(kcal)')
      .eq('user_id', userId)
      .order('date')
    return data?.flatMap((meal) =>
      (meal.meal_items as { kcal: number }[]).map((item) => Number(item.kcal)),
    )
  }
  // hers: three weeks ago unchanged, today's new; mine (from the dish) new
  await expect.poll(() => kcalOf(partner.id)).toEqual([60, 80])
  await expect.poll(() => kcalOf(me.id)).toEqual([80])
  await tabs.getByRole('button', { name: 'Today' }).click()
  await expect(activePage(page).getByText('80 kcal').first()).toBeVisible()
})
