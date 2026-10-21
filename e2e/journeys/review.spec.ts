import { activePage, expect, localDay, logIn, test } from './backend.ts'

test('the weekly review: an ingredient fix applied, one ignored, a meal finding opens its day', async ({
  page,
  backend,
}) => {
  const me = await backend.user('Rita')
  const household = await backend.household([me])
  const { data: ingredients } = await backend.admin
    .from('ingredients')
    .insert([
      {
        household_id: household,
        category_id: await backend.category(household),
        name: 'Buter',
        kcal_100: 740,
      },
      {
        household_id: household,
        category_id: await backend.category(household),
        name: 'Milk',
        kcal_100: 64,
        unit_label: 'glass',
        unit_weight_g: 2500,
      },
    ])
    .select('id, name')
  const idOf = (name: string) => ingredients?.find((row) => row.name === name)?.id
  // what the review routine would have sent
  const seeded = await backend.admin.from('review_findings').insert([
    {
      household_id: household,
      ingredient_id: idOf('Buter'),
      kind: 'typo',
      message: 'The name looks misspelled.',
      suggestion: { name: 'Butter' },
      run_id: 'journey',
    },
    {
      household_id: household,
      ingredient_id: idOf('Milk'),
      kind: 'unit_weight',
      message: 'A glass is about 250 ml.',
      suggestion: { unit_weight_g: 250 },
      run_id: 'journey',
    },
  ])
  // a day finding (in its own insert: a batch would send its missing suggestion as null)
  const seededDay = await backend.admin.from('review_findings').insert({
    household_id: household,
    user_id: me.id,
    date: localDay(3),
    meal_type: 'lunch',
    kind: 'missing_meal',
    message: 'Breakfast and dinner are logged, but no lunch.',
    run_id: 'journey',
  })
  expect(seeded.error ?? seededDay.error).toBeNull()
  await logIn(page, me)
  await page
    .getByRole('navigation', { name: 'Tabs' })
    .getByRole('button', { name: 'Ingredients' })
    .click()
  const list = activePage(page)

  await list.getByRole('button', { name: 'Review: 3' }).click()
  const review = page.getByRole('dialog', { name: 'Review' })
  const typo = review.getByRole('article', { name: /Buter/ })
  await expect(typo).toContainText('Buter → Butter')
  await typo.getByRole('button', { name: 'Apply fix' }).click()
  await review
    .getByRole('article', { name: /Milk/ })
    .getByRole('button', { name: 'Ignore' })
    .click()
  await expect(review.getByRole('article', { name: /^Rita/ })).toContainText('Missing meal')

  // the meal finding opens that day in History
  await review
    .getByRole('article', { name: /^Rita/ })
    .getByRole('button', { name: 'Open day' })
    .click()
  await expect(review).toBeHidden()
  await expect(page).toHaveURL(new RegExp(`/history/${localDay(3)}$`))
  await expect(activePage(page).getByRole('heading', { level: 1, name: 'History' })).toBeVisible()
  await page
    .getByRole('navigation', { name: 'Tabs' })
    .getByRole('button', { name: 'Ingredients' })
    .click()
  await expect(list.getByRole('button', { name: /^Butter/ })).toBeVisible()
  await list.getByRole('button', { name: 'Review: 1' }).click()
  await review.getByRole('article', { name: /^Rita/ }).getByRole('button', { name: 'Done' }).click()
  await expect(review).toContainText('Nothing left to review.')
  await page.keyboard.press('Escape')
  await expect(list.getByRole('button', { name: /^Review/ })).toHaveCount(0)
  await expect
    .poll(async () => {
      const { data } = await backend.admin
        .from('review_findings')
        .select('kind, status, decided_by')
        .eq('household_id', household)
        .order('kind')
      return data
    })
    .toEqual([
      { kind: 'typo', status: 'applied', decided_by: me.id },
      { kind: 'unit_weight', status: 'ignored', decided_by: me.id },
      { kind: 'missing_meal', status: 'applied', decided_by: me.id },
    ])
})

test('a duplicate from the review is compared and merged; its meal moves over', async ({
  page,
  backend,
}) => {
  const me = await backend.user('Mara')
  const household = await backend.household([me])
  const categoryId = await backend.category(household)
  const { data: ingredients } = await backend.admin
    .from('ingredients')
    .insert([
      { household_id: household, category_id: categoryId, name: 'Toastkäse', kcal_100: 300 },
      {
        household_id: household,
        category_id: categoryId,
        name: 'Toast-Käsescheiben',
        kcal_100: 310,
        unit_label: 'slice',
        unit_weight_g: 20,
      },
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
    ingredient_id: idOf('Toast-Käsescheiben'),
    name: 'Toast-Käsescheiben',
    entered_amount: 40,
    entered_unit: 'g',
    basis: 'per_100g',
    basis_multiplier: 0.4,
    kcal: 124,
  })
  const seeded = await backend.admin.from('review_findings').insert({
    household_id: household,
    ingredient_id: idOf('Toastkäse'),
    kind: 'duplicate',
    message: 'Same as "Toast-Käsescheiben".',
    suggestion: { duplicate_of: idOf('Toast-Käsescheiben') },
    run_id: 'journey',
  })
  expect(seeded.error).toBeNull()
  await logIn(page, me)
  await page
    .getByRole('navigation', { name: 'Tabs' })
    .getByRole('button', { name: 'Ingredients' })
    .click()
  const list = activePage(page)

  await list.getByRole('button', { name: 'Review: 1' }).click()
  const review = page.getByRole('dialog', { name: 'Review' })
  await review
    .getByRole('article', { name: /Toastkäse/ })
    .getByRole('button', { name: 'Compare' })
    .click()
  await review.getByRole('button', { name: /^Keep Toastkäse/ }).click()
  await review.getByRole('button', { name: /Take Unit weight from Toast-Käsescheiben/ }).click()
  await review.getByRole('button', { name: 'Merge into Toastkäse' }).click()
  await expect(review).toContainText('Nothing left to review.')

  await expect
    .poll(async () => {
      const { data: left } = await backend.admin
        .from('ingredients')
        .select('name, unit_weight_g')
        .eq('household_id', household)
      const { data: item } = await backend.admin
        .from('meal_items')
        .select('ingredient_id, kcal')
        .eq('meal_id', meal?.id ?? '')
      return { left, item }
    })
    .toEqual({
      left: [{ name: 'Toastkäse', unit_weight_g: 20 }],
      item: [{ ingredient_id: idOf('Toastkäse'), kcal: 124 }],
    })
})
