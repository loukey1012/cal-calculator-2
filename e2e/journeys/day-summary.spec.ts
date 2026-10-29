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

  // back to the defaults (the throwaway account goes away anyway; this keeps a rerun honest)
  await handle('Carbs').focus()
  await page.keyboard.press('ArrowDown')
  await handle('Calories left or over').focus()
  await page.keyboard.press('ArrowDown')
  await summary().getByRole('switch', { name: 'Calories left or over' }).click()
  await expect(body()).toHaveText('Protein 121 of 140 g · Carbs 200 of 220 g · Fat 62 of 70 g')
  await expect
    .poll(savedSummary)
    .toEqual(['status:true', 'protein:true', 'carbs:true', 'fat:true', 'calories:false'])
})
