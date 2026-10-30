import { activePage, expect, localDay, logIn, test } from './backend.ts'

const chip = (page: ReturnType<typeof activePage>, name: string) =>
  page.getByRole('group', { name: 'Day flags' }).getByRole('button', { name, exact: true })

// a disclosure button: its name lists the marked meals
const cheatMealChip = (page: ReturnType<typeof activePage>) =>
  page.getByRole('group', { name: 'Day flags' }).getByRole('button', { name: /^Cheat meal/ })

test('the Gym chip saves at once and Undo takes it back', async ({ page, backend }) => {
  const me = await backend.user('Gina')
  await backend.household([me])
  await logIn(page, me)
  const today = activePage(page)
  const gymRows = async () => {
    const { data } = await backend.admin
      .from('gym_days')
      .select('user_id, date')
      .eq('user_id', me.id)
    return data
  }

  await chip(today, 'Gym').click()
  await expect(chip(today, 'Gym')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('status').filter({ hasText: 'Gym set' })).toBeVisible()
  await expect.poll(gymRows).toEqual([{ user_id: me.id, date: localDay() }])

  await page.getByRole('status').getByRole('button', { name: 'Undo' }).click()
  await expect(chip(today, 'Gym')).toHaveAttribute('aria-pressed', 'false')
  await expect.poll(gymRows).toEqual([])
})

test('Cheat day and Alcohol replace each other', async ({ page, backend }) => {
  const me = await backend.user('Cora')
  await backend.household([me])
  await logIn(page, me)
  const today = activePage(page)
  const marks = async () => {
    const { data } = await backend.admin
      .from('cheat_days')
      .select('date, kind')
      .eq('user_id', me.id)
    return data
  }

  await chip(today, 'Cheat day').click()
  await expect(chip(today, 'Cheat day')).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(marks).toEqual([{ date: localDay(), kind: 'cheat' }])

  await chip(today, 'Alcohol').click()
  await expect(chip(today, 'Alcohol')).toHaveAttribute('aria-pressed', 'true')
  await expect(chip(today, 'Cheat day')).toHaveAttribute('aria-pressed', 'false')
  await expect.poll(marks).toEqual([{ date: localDay(), kind: 'alcohol' }])
})

test('the Cheat meal popover marks several meals and stays open', async ({ page, backend }) => {
  const me = await backend.user('Mona')
  await backend.household([me])
  await logIn(page, me)
  const today = activePage(page)
  const cheatMeals = async () => {
    const { data } = await backend.admin
      .from('meals')
      .select('meal_type')
      .eq('user_id', me.id)
      .eq('date', localDay())
      .eq('cheat_meal', true)
    return (data ?? []).map((row) => row.meal_type).sort()
  }

  await cheatMealChip(today).click()
  const popover = page.getByRole('dialog', { name: 'Cheat meals' })
  await popover.getByRole('button', { name: 'Lunch' }).click()
  await expect(popover.getByRole('button', { name: 'Lunch' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await popover.getByRole('button', { name: 'Dinner' }).click()
  await expect(popover.getByRole('button', { name: 'Dinner' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(popover).toBeVisible()
  await expect.poll(cheatMeals).toEqual(['dinner', 'lunch'])

  await page.keyboard.press('Escape')
  await expect(popover).toBeHidden()
  await expect(cheatMealChip(today)).toHaveAccessibleName('Cheat meal: Lunch, Dinner')
})

test("on the partner's day the chip sets the partner's flag", async ({ page, backend }) => {
  const me = await backend.user('Lukas')
  const partner = await backend.user('Lisa')
  await backend.household([me, partner])
  await logIn(page, me)
  const today = activePage(page)
  await today
    .getByRole('radiogroup', { name: 'Person' })
    .getByRole('radio', { checked: false })
    .click()

  await chip(today, 'Gym').click()
  await expect(chip(today, 'Gym')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('status').filter({ hasText: /^Gym set for / })).toBeVisible()
  await expect
    .poll(async () => {
      const { data } = await backend.admin
        .from('gym_days')
        .select('user_id, date')
        .in('user_id', [me.id, partner.id])
      return data
    })
    .toEqual([{ user_id: partner.id, date: localDay() }])
})

test('a sideways drag on the chip row does not switch tabs', async ({ page, backend }) => {
  const me = await backend.user('Dora')
  await backend.household([me])
  await logIn(page, me)
  const today = activePage(page)
  const row = today.getByRole('group', { name: 'Day flags' })
  const box = await row.boundingBox()
  await page.mouse.move(box!.x + box!.width - 20, box!.y + box!.height / 2)
  await page.mouse.down()
  await page.mouse.move(box!.x + 20, box!.y + box!.height / 2, { steps: 10 })
  await page.mouse.up()
  await expect(today.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible()
  await expect(row).toBeVisible()
})
