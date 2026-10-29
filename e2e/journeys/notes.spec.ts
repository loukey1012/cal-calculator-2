import { activePage, dayLabel, expect, localDay, logIn, test } from './backend.ts'

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

test('a day note written on its own page on Today, then removed', async ({ page, backend }) => {
  const me = await backend.user('Nora')
  await backend.household([me])
  await logIn(page, me)
  const today = activePage(page)
  const dayNotes = async () => {
    const { data } = await backend.admin.from('day_notes').select('note').eq('user_id', me.id)
    return data
  }

  await today.getByRole('button', { name: /^Day note: Add a note/ }).click()
  const field = today.getByRole('textbox', { name: 'Note' })
  await expect(field).toBeFocused()
  await field.fill('Birthday at work')
  await expect(today.getByText('16 / 500')).toBeVisible()
  // nothing is kept before Done
  expect(await dayNotes()).toEqual([])
  await today.getByRole('button', { name: 'Done' }).click()

  await expect.poll(dayNotes).toEqual([{ note: 'Birthday at work' }])
  await expect(today.getByRole('button', { name: /^Day note: Birthday at work/ })).toBeVisible()

  await today.getByRole('button', { name: /^Day note: Birthday at work/ }).click()
  await today.getByRole('textbox', { name: 'Note' }).clear()
  await today.getByRole('button', { name: 'Done' }).click()
  await expect.poll(dayNotes).toEqual([])
  await expect(today.getByRole('button', { name: /^Day note: Add a note/ })).toBeVisible()
})

test('a meal note in History, and leaving the note page with edits asks first', async ({
  page,
  backend,
}) => {
  const me = await backend.user('Lena')
  await backend.household([me])
  const yesterday = localDay(1)
  const { data: meal } = await backend.admin
    .from('meals')
    .insert({ user_id: me.id, date: yesterday, meal_type: 'lunch' })
    .select('id')
    .single()
  await backend.admin.from('meal_items').insert({
    meal_id: meal?.id,
    name: 'Soup',
    entered_amount: 1,
    entered_unit: 'unit',
    basis: 'per_unit',
    basis_multiplier: 1,
    kcal: 300,
  })
  await logIn(page, me)
  const mealNote = async () => {
    const { data } = await backend.admin.from('meals').select('note').eq('id', meal?.id)
    return data
  }

  await page
    .getByRole('navigation', { name: 'Tabs' })
    .getByRole('button', { name: 'History' })
    .click()
  const history = activePage(page)
  if (yesterday.slice(0, 7) !== localDay().slice(0, 7)) {
    await history.getByRole('button', { name: 'Previous month' }).click()
  }
  await history
    .getByRole('button', { name: dayLabel(yesterday, 'lunch or dinner missing') })
    .click()
  await history.getByRole('region').getByRole('button', { name: /Lunch/ }).click()
  await history.getByRole('button', { name: /^Lunch note: Add a note/ }).click()
  await expect(history.getByText(/· Lunch$/)).toBeVisible()
  await history.getByRole('textbox', { name: 'Note' }).fill('Restaurant with friends')

  // Cancel with edits asks; keeping the page keeps the text
  page.once('dialog', (dialog) => dialog.dismiss())
  await history.getByRole('button', { name: 'Cancel' }).click()
  await expect(history.getByRole('textbox', { name: 'Note' })).toHaveValue(
    'Restaurant with friends',
  )

  // so does the back swipe
  page.once('dialog', (dialog) => dialog.dismiss())
  await swipeBack(page)
  await expect(history.getByRole('textbox', { name: 'Note' })).toHaveValue(
    'Restaurant with friends',
  )
  expect(await mealNote()).toEqual([{ note: null }])

  // Done keeps it and leads back to the meal, which shows it in its Note row
  await history.getByRole('button', { name: 'Done' }).click()
  await expect(
    history.getByRole('button', { name: /^Lunch note: Restaurant with friends/ }),
  ).toBeVisible()
  await expect.poll(mealNote).toEqual([{ note: 'Restaurant with friends' }])

  // an unchanged note page goes back without asking, by the swipe too
  await history.getByRole('button', { name: /^Lunch note: Restaurant/ }).click()
  await expect(history.getByRole('textbox', { name: 'Note' })).toHaveValue(
    'Restaurant with friends',
  )
  await swipeBack(page)
  await expect(history.getByRole('button', { name: /^Lunch note: Restaurant/ })).toBeVisible()

  // back on the meal, Back leads to the History day, which shows the meal note on the card
  await history.getByRole('button', { name: 'Back' }).click()
  await expect(
    history.getByRole('button', { name: /Lunch.*Restaurant with friends/ }),
  ).toBeVisible()
})
