import { activePage, dayLabel, expect, logIn, test } from './backend.ts'

const pad = (value: number) => String(value).padStart(2, '0')

/** A day of the previous calendar month, so the seeded days never depend on today's date. */
function previousMonthDay(dayOfMonth: number): string {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return `${first.getFullYear()}-${pad(first.getMonth() + 1)}-${pad(dayOfMonth)}`
}

const monthTitle = (date: string) => {
  const [year, month] = date.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
    new Date(year ?? 0, (month ?? 1) - 1, 1),
  )
}

test('the calendar shows symbols and the week bar of the open day; swipe turns the month; hold shows a quick look', async ({
  page,
  backend,
}) => {
  const me = await backend.user('Greta')
  await backend.household([me])
  const completeDay = previousMonthDay(10)
  const noteDay = previousMonthDay(11)
  const weighDay = previousMonthDay(12)
  const alcoholDay = previousMonthDay(13)
  const noteText = 'Dinner at the lake'

  // Arrange: a goal, one complete day within it (lunch 800 + dinner 1000), and three marked days
  await backend.admin
    .from('goal_history')
    .insert({ user_id: me.id, valid_from: previousMonthDay(1), kcal: 2000 })
  for (const [mealType, kcal] of [
    ['lunch', 800],
    ['dinner', 1000],
  ] as const) {
    const { data: meal } = await backend.admin
      .from('meals')
      .insert({ user_id: me.id, date: completeDay, meal_type: mealType })
      .select('id')
      .single()
    await backend.admin.from('meal_items').insert({
      meal_id: meal?.id,
      name: `Seeded ${mealType}`,
      entered_amount: 1,
      entered_unit: 'unit',
      basis: 'per_unit',
      basis_multiplier: 1,
      kcal,
    })
  }
  await backend.admin.from('day_notes').insert({ user_id: me.id, date: noteDay, note: noteText })
  await backend.admin
    .from('weight_entries')
    .insert({ user_id: me.id, date: weighDay, weight_kg: 70.5 })
  await backend.admin
    .from('cheat_days')
    .insert({ user_id: me.id, date: alcoholDay, kind: 'alcohol' })

  await logIn(page, me)
  await page
    .getByRole('navigation', { name: 'Tabs' })
    .getByRole('button', { name: 'History' })
    .click()
  const history = activePage(page)
  const currentTitle = monthTitle(
    `${new Date().getFullYear()}-${pad(new Date().getMonth() + 1)}-01`,
  )
  await expect(history.getByRole('heading', { name: currentTitle })).toBeVisible()
  // no way back to the current month while it is shown
  await expect(history.getByRole('button', { name: 'Today', exact: true })).toHaveCount(0)

  // swiping the grid sideways turns the month, and stays on History
  const grid = history.locator('[data-swipe-lock]')
  const box = await grid.boundingBox()
  if (!box) throw new Error('calendar grid has no box')
  const y = box.y + 12
  await page.mouse.move(box.x + 40, y)
  await page.mouse.down()
  await page.mouse.move(box.x + 140, y, { steps: 5 })
  await page.mouse.move(box.x + 240, y, { steps: 5 })
  await page.mouse.up()
  await expect(history.getByRole('heading', { name: monthTitle(completeDay) })).toBeVisible()
  await expect(
    page.getByRole('navigation', { name: 'Tabs' }).getByRole('button', { name: 'History' }),
  ).toHaveAttribute('aria-current', 'page')
  await expect(page).toHaveURL(/\/history/)

  // the days carry their marks in their names
  await expect(
    history.getByRole('button', { name: dayLabel(noteDay, '.*has a note') }),
  ).toBeVisible()
  await expect(
    history.getByRole('button', { name: dayLabel(weighDay, '.*weigh-in') }),
  ).toBeVisible()
  await expect(
    history.getByRole('button', { name: dayLabel(alcoholDay, 'alcohol day') }),
  ).toBeVisible()

  const completeButton = history.locator(`button[data-date="${completeDay}"]`)

  // an open day starts with its verdict; the note is a card
  // a tap right after the swipe is swallowed on purpose (the finger's own click): retry until it lands
  await expect(async () => {
    await completeButton.click()
    await expect(completeButton).toHaveAttribute('aria-pressed', 'true', { timeout: 500 })
  }).toPass()
  // only the complete day counts: the week bar under the grid shows the open day's week with
  // its calories as the average (no calories burned set, so no saved figure)
  await expect(
    history.getByRole('button', { name: /^Week \d+, average 1,800 kcal$/ }),
  ).toBeVisible()
  const day = history.getByRole('region')
  await expect(day.getByTestId('day-status')).toContainText('Within goal')
  await expect(day.getByTestId('day-status')).toContainText('200 kcal left')
  await history.locator(`button[data-date="${noteDay}"]`).click()
  await expect(
    day.getByRole('button', { name: /note/i }).filter({ hasText: noteText }),
  ).toBeVisible()
  await history.locator(`button[data-date="${alcoholDay}"]`).click()
  await expect(day.getByTestId('day-status')).toContainText('Alcohol day')
  await expect(day.getByTestId('day-status')).toContainText('not counted')

  // holding a day shows a quick look; lifting the finger closes it without selecting the day
  const held = history.locator(`button[data-date="${noteDay}"]`)
  await held.hover()
  await page.mouse.down()
  const quickLook = page
    .getByRole('dialog', { name: /October|^\w+day, / })
    .or(page.getByRole('dialog').filter({ hasText: noteText }))
  await expect(quickLook).toBeVisible({ timeout: 3_000 })
  await expect(quickLook).toContainText(noteText)
  await page.mouse.up()
  await expect(quickLook).toBeHidden()
  await expect(held).toHaveAttribute('aria-pressed', 'false')
  await expect(history.locator(`button[data-date="${alcoholDay}"]`)).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  // the year overview (⋯ menu): twelve small months in the days' colors; a tap opens a month
  await history.getByRole('button', { name: 'Calendar options' }).click()
  await page
    .getByRole('dialog', { name: 'Calendar' })
    .getByRole('button', { name: 'Year overview' })
    .click()
  const seededYear = completeDay.slice(0, 4)
  await expect(history.getByRole('heading', { name: seededYear, exact: true })).toBeVisible()
  await expect(
    history.getByRole('button', { name: new RegExp(`^\\w+ ${seededYear}$`) }),
  ).toHaveCount(12)
  await expect(history.locator(`[data-date="${completeDay}"]`)).toHaveAttribute(
    'data-status',
    'onTarget',
  )
  await expect(history.locator(`[data-date="${alcoholDay}"]`)).toHaveAttribute(
    'data-status',
    'alcoholDay',
  )
  await history.getByRole('button', { name: monthTitle(completeDay), exact: true }).click()
  await expect(history.getByRole('heading', { name: monthTitle(completeDay) })).toBeVisible()
  await expect(history.locator(`button[data-date="${completeDay}"]`)).toBeVisible()

  // Today brings the current month back
  await history.getByRole('button', { name: 'Today', exact: true }).click()
  await expect(history.getByRole('heading', { name: currentTitle })).toBeVisible()

  // the month title (a button inside the heading) opens the year again
  await history.getByRole('button', { name: currentTitle, exact: true }).click()
  await expect(
    history.getByRole('heading', { name: String(new Date().getFullYear()), exact: true }),
  ).toBeVisible()
  await expect(history.getByRole('button', { name: 'Previous month' })).toHaveCount(0)
})

test('the Notes tab lists and searches the notes and opens their day; the Notes filter fades the other days and stays on', async ({
  page,
  backend,
}) => {
  const me = await backend.user('Greta')
  await backend.household([me])
  const noteDay = previousMonthDay(11)
  const plainDay = previousMonthDay(12)
  const emptyDay = previousMonthDay(13)
  const noteText = 'Dinner at the lake'

  // Arrange: one day with a note, one day with only a weigh-in, in the previous month
  await backend.admin.from('day_notes').insert({ user_id: me.id, date: noteDay, note: noteText })
  await backend.admin
    .from('weight_entries')
    .insert({ user_id: me.id, date: plainDay, weight_kg: 70 })

  await logIn(page, me)
  await page
    .getByRole('navigation', { name: 'Tabs' })
    .getByRole('button', { name: 'History' })
    .click()
  const history = activePage(page)

  // the note is listed in the Notes tab under its month, and found by a search without accents
  await history.getByRole('radio', { name: 'Notes' }).click()
  await expect(history.getByRole('heading', { name: monthTitle(noteDay) })).toBeVisible()
  const note = history.getByRole('button', { name: new RegExp(noteText) })
  await expect(note).toBeVisible()
  await history.getByRole('searchbox', { name: 'Search notes' }).fill('DÍNNER')
  await expect(note).toBeVisible()
  await history.getByRole('searchbox', { name: 'Search notes' }).fill('sushi')
  await expect(note).toHaveCount(0)
  await history.getByRole('searchbox', { name: 'Search notes' }).fill('lake')

  // a tap opens that day in the calendar
  await note.click()
  await expect(history.getByRole('radio', { name: 'Calendar' })).toBeChecked()
  await expect(history.getByRole('heading', { name: monthTitle(noteDay) })).toBeVisible()
  await expect(history.locator(`button[data-date="${noteDay}"]`)).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page).toHaveURL(new RegExp(`/history/${noteDay}`))

  // the Notes filter fades the days without a note, and stays on after opening another day
  await history.getByRole('button', { name: 'Filter', exact: true }).click()
  await page
    .getByRole('dialog', { name: 'Highlight days' })
    .getByRole('button', { name: 'Notes' })
    .click()
  await expect(history.getByRole('button', { name: 'Filter: Notes' })).toBeVisible()
  await expect(history.getByText('Notes highlighted')).toBeVisible()
  await expect(history.locator(`button[data-date="${plainDay}"]`)).toHaveAttribute(
    'data-faded',
    'true',
  )
  await expect(history.locator(`button[data-date="${noteDay}"]`)).not.toHaveAttribute(
    'data-faded',
    'true',
  )
  await history.locator(`button[data-date="${plainDay}"]`).click()
  await expect(page).toHaveURL(new RegExp(`/history/${plainDay}`))
  await expect(history.getByRole('button', { name: 'Filter: Notes' })).toBeVisible()
  // the open day never fades; the other days without a note still do
  await expect(history.locator(`button[data-date="${plainDay}"]`)).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(history.locator(`button[data-date="${plainDay}"]`)).not.toHaveAttribute(
    'data-faded',
    'true',
  )
  await expect(history.locator(`button[data-date="${emptyDay}"]`)).toHaveAttribute(
    'data-faded',
    'true',
  )

  // Clear in the pill removes the filter
  await history.getByRole('button', { name: 'Clear', exact: true }).click()
  await expect(history.getByRole('button', { name: 'Filter', exact: true })).toBeVisible()
  await expect(history.locator(`button[data-date="${emptyDay}"]`)).not.toHaveAttribute(
    'data-faded',
    'true',
  )
})
