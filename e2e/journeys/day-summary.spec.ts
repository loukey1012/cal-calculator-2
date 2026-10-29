import { activePage, expect, logIn, test } from './backend.ts'

const DAY_SUMMARY = '/settings/notifications/day-summary'

test('the day summary: preview, parts switched on, moved by keyboard and by drag, kept in the account', async ({
  page,
  backend,
}) => {
  const me = await backend.user('Dana')
  await backend.household([me])
  await logIn(page, me)
  // Settings › Notifications only offers the account settings where push works (an installed
  // iPhone app); the page itself renders anywhere, so open it by its address
  await page.goto(DAY_SUMMARY)
  const summary = () => activePage(page)
  const preview = () => summary().getByRole('group', { name: 'Notification preview' })
  const body = () => summary().getByTestId('preview-body')
  const order = () =>
    summary()
      .locator('button[aria-label^="Move "]')
      .evaluateAll((handles) =>
        handles
          .map((handle) => (handle.getAttribute('aria-label') ?? '').replace('Move ', ''))
          .filter((label) => !/ (up|down)$/.test(label)),
      )
  const savedSummary = async () => {
    const { data } = await backend.admin
      .from('notification_preferences')
      .select('settings')
      .eq('user_id', me.id)
      .maybeSingle()
    const parts = (data?.settings as { summary?: { parts?: { id: string; on: boolean }[] } })
      ?.summary?.parts
    return (parts ?? []).map((part) => `${part.id}:${part.on}`).slice(0, 5)
  }

  // the example day with the default parts
  await expect(preview()).toContainText('Yesterday: 1850 of 2000 kcal')
  await expect(summary().getByText('Example day')).toBeVisible()
  await expect(body()).toHaveText('Protein 121 of 140 g · Carbs 200 of 220 g · Fat 62 of 70 g')
  expect(await order()).toEqual([
    'Cheat or alcohol day',
    'Protein',
    'Carbs',
    'Fat',
    'Calories left or over',
    'Fiber',
    'Sugar',
    'Salt',
    'Missing meals',
    'Week so far: Ø calories',
    'Week so far: calories saved',
  ])

  // switching a part on changes the preview (it comes after Fat)
  await summary().getByRole('switch', { name: 'Calories left or over' }).click()
  await expect(body()).toHaveText(
    'Protein 121 of 140 g · Carbs 200 of 220 g · Fat 62 of 70 g · 150 kcal left',
  )

  // the arrow key moves a part one step, and the status says so
  const handle = (label: string) =>
    summary().getByRole('button', { name: `Move ${label}`, exact: true })
  await handle('Calories left or over').focus()
  await page.keyboard.press('ArrowUp')
  await expect(summary().getByRole('status')).toHaveText(
    'Calories left or over moved to position 4 of 11',
  )
  await expect(body()).toHaveText(
    'Protein 121 of 140 g · Carbs 200 of 220 g · 150 kcal left · Fat 62 of 70 g',
  )
  expect((await order()).slice(0, 5)).toEqual([
    'Cheat or alcohol day',
    'Protein',
    'Carbs',
    'Calories left or over',
    'Fat',
  ])
  await expect(handle('Calories left or over')).toBeFocused()

  // a pointer drag of Protein down by one row
  const box = await handle('Protein').boundingBox()
  const row = await summary().getByRole('listitem').nth(1).boundingBox()
  if (!box || !row) throw new Error('Protein row is not on screen')
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  const steps = 8
  for (let step = 1; step <= steps; step++) {
    await page.mouse.move(x, y + (row.height * step) / steps)
  }
  await page.mouse.up()
  await expect
    .poll(async () => (await order()).slice(0, 5))
    .toEqual(['Cheat or alcohol day', 'Carbs', 'Protein', 'Calories left or over', 'Fat'])
  await expect(body()).toHaveText(
    'Carbs 200 of 220 g · Protein 121 of 140 g · 150 kcal left · Fat 62 of 70 g',
  )

  // saved to the account, and still there after a reload
  await expect
    .poll(savedSummary)
    .toEqual(['status:true', 'carbs:true', 'protein:true', 'calories:true', 'fat:true'])
  await page.reload()
  await expect(body()).toHaveText(
    'Carbs 200 of 220 g · Protein 121 of 140 g · 150 kcal left · Fat 62 of 70 g',
  )
  expect((await order()).slice(0, 5)).toEqual([
    'Cheat or alcohol day',
    'Carbs',
    'Protein',
    'Calories left or over',
    'Fat',
  ])
  await expect(summary().getByRole('switch', { name: 'Calories left or over' })).toBeChecked()
})

const WEEKLY_SUMMARY = '/settings/notifications/weekly-summary'

test('the weekly summary: preview, a part switched on and moved, kept in the account', async ({
  page,
  backend,
}) => {
  const me = await backend.user('Dana')
  await backend.household([me])
  await logIn(page, me)
  await page.goto(WEEKLY_SUMMARY)
  const weekly = () => activePage(page)
  const preview = () => weekly().getByRole('group', { name: 'Notification preview' })
  const body = () => weekly().getByTestId('preview-body')
  const handle = (label: string) =>
    weekly().getByRole('button', { name: `Move ${label}`, exact: true })
  type SavedWeekly = { parts?: { id: string; on: boolean }[]; onlyWithGoal?: boolean }
  const savedWeekly = async (): Promise<SavedWeekly | undefined> => {
    const { data } = await backend.admin
      .from('notification_preferences')
      .select('settings')
      .eq('user_id', me.id)
      .maybeSingle()
    return (data?.settings as { weekly?: SavedWeekly } | undefined)?.weekly
  }
  const savedParts = async () =>
    ((await savedWeekly())?.parts ?? []).map((part) => `${part.id}:${part.on}`).slice(0, 4)
  const savedOnlyWithGoal = async () => (await savedWeekly())?.onlyWithGoal

  // the example week with the default parts
  await expect(preview()).toContainText('Week 43: 2,100 kcal saved')
  await expect(weekly().getByText('Example week')).toBeVisible()
  await expect(body()).toHaveText('Ø 1,930 kcal · 5 of 6 days within goal')

  // switching a part on adds it after the others
  await weekly().getByRole('switch', { name: 'Burned and eaten' }).click()
  await expect(body()).toHaveText(
    'Ø 1,930 kcal · 5 of 6 days within goal · Burned 13,680 · ate 11,580 kcal',
  )

  // the arrow key moves it up one step
  await handle('Burned and eaten').focus()
  await page.keyboard.press('ArrowUp')
  await expect(body()).toHaveText(
    'Ø 1,930 kcal · Burned 13,680 · ate 11,580 kcal · 5 of 6 days within goal',
  )
  await expect
    .poll(savedParts)
    .toEqual(['saved:true', 'average:true', 'burnedEaten:true', 'withinGoal:true'])

  // still there after a reload
  await page.reload()
  await expect(body()).toHaveText(
    'Ø 1,930 kcal · Burned 13,680 · ate 11,580 kcal · 5 of 6 days within goal',
  )
  await expect(weekly().getByRole('switch', { name: 'Burned and eaten' })).toBeChecked()

  // "Only nutrients with a goal" is saved to the account
  await weekly().getByRole('switch', { name: 'Only nutrients with a goal' }).click()
  await expect.poll(savedOnlyWithGoal).toBe(true)
})
