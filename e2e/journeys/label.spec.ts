import { activePage, expect, logIn, test } from './backend.ts'

// a German nutrition table, as a photo of it would show
const LABEL_HTML = `
<body style="margin:0;background:#fff;font:600 34px Arial,sans-serif;color:#111">
  <table style="border-collapse:collapse;margin:40px" cellpadding="14">
    <tr><th align="left">Nährwerte</th><th align="right">pro 100 g</th></tr>
    <tr><td>Energie</td><td align="right">1520 kJ / 363 kcal</td></tr>
    <tr><td>Fett</td><td align="right">9,8 g</td></tr>
    <tr><td>davon gesättigte Fettsäuren</td><td align="right">1,2 g</td></tr>
    <tr><td>Kohlenhydrate</td><td align="right">58 g</td></tr>
    <tr><td>davon Zucker</td><td align="right">21 g</td></tr>
    <tr><td>Ballaststoffe</td><td align="right">6,5 g</td></tr>
    <tr><td>Eiweiß</td><td align="right">8,4 g</td></tr>
    <tr><td>Salz</td><td align="right">0,48 g</td></tr>
  </table>
</body>`

test('a photo of a nutrition table is read on the phone and fills in the form', async ({
  page,
  context,
  backend,
}) => {
  test.slow() // the text recognition loads about 8 MB the first time
  const me = await backend.user('Lena')
  await backend.household([me])
  // the "photo": the table rendered in its own tab
  const camera = await context.newPage()
  await camera.setViewportSize({ width: 900, height: 760 })
  await camera.setContent(LABEL_HTML)
  const photo = await camera.screenshot({ type: 'png' })
  await camera.close()
  await logIn(page, me)
  await page
    .getByRole('navigation', { name: 'Tabs' })
    .getByRole('button', { name: 'Ingredients' })
    .click()
  await activePage(page).getByRole('button', { name: 'Add ingredient' }).click()
  const sheet = page.getByRole('dialog', { name: 'New Ingredient' })

  await sheet
    .getByLabel('Photo of the nutrition label')
    .setInputFiles({ name: 'label.png', mimeType: 'image/png', buffer: photo })

  await expect(sheet.getByLabel('Calories per 100 g', { exact: true })).toHaveValue('363', {
    timeout: 60_000,
  })
  // the browser renders the "photo" a little differently each time: the solid parts are checked,
  // the parsing of every row is covered by labelParser.test.ts
  await expect(sheet.getByLabel('Salt per 100 g', { exact: true })).toHaveValue('0.48')
  await expect(sheet.getByLabel('Fat per 100 g', { exact: true })).toHaveValue(/^9/)
  await expect(sheet.getByText(/Read [78] values from the label/)).toBeVisible()
})
