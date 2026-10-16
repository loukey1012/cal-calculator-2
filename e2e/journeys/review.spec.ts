import { activePage, expect, logIn, test } from './backend.ts'

test('a finding from the ingredient review is applied, another one ignored', async ({
  page,
  backend,
}) => {
  const me = await backend.user('Rita')
  const household = await backend.household([me])
  const { data: ingredients } = await backend.admin
    .from('ingredients')
    .insert([
      { household_id: household, name: 'Buter', kcal_100: 740 },
      {
        household_id: household,
        name: 'Milk',
        kcal_100: 64,
        unit_label: 'glass',
        unit_weight_g: 2500,
      },
    ])
    .select('id, name')
  const idOf = (name: string) => ingredients?.find((row) => row.name === name)?.id
  // what the review routine would have sent
  await backend.admin.from('ingredient_findings').insert([
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
  await logIn(page, me)
  await page
    .getByRole('navigation', { name: 'Tabs' })
    .getByRole('button', { name: 'Ingredients' })
    .click()
  const list = activePage(page)

  await list.getByRole('button', { name: 'Review: 2' }).click()
  const review = page.getByRole('dialog', { name: 'Review' })
  const typo = review.getByRole('article', { name: /Buter/ })
  await expect(typo).toContainText('Buter → Butter')
  await typo.getByRole('button', { name: 'Apply fix' }).click()
  await review
    .getByRole('article', { name: /Milk/ })
    .getByRole('button', { name: 'Ignore' })
    .click()
  await expect(review).toContainText('Nothing left to review.')

  await page.keyboard.press('Escape')
  await expect(list.getByRole('button', { name: /^Butter/ })).toBeVisible()
  await expect(list.getByRole('button', { name: /^Review/ })).toHaveCount(0)
  await expect
    .poll(async () => {
      const { data } = await backend.admin
        .from('ingredient_findings')
        .select('kind, status, decided_by')
        .eq('household_id', household)
        .order('kind')
      return data
    })
    .toEqual([
      { kind: 'typo', status: 'applied', decided_by: me.id },
      { kind: 'unit_weight', status: 'ignored', decided_by: me.id },
    ])
})
