import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { CurrentUserContext } from '../../app/currentUser'
import { renderWithProviders } from '../../test/render'
import { category, categoryGroup, ingredient } from './testData'

vi.mock('./ingredientsApi', () => ({
  fetchIngredients: vi.fn(),
  fetchCategories: vi.fn(),
  fetchCategoryGroups: vi.fn().mockResolvedValue([]),
  createIngredient: vi.fn(),
  updateIngredient: vi.fn(),
  deleteIngredient: vi.fn(),
  createCategory: vi.fn(),
}))

vi.mock('../barcode/openFoodFacts', () => ({ lookupProduct: vi.fn() }))
const scanned = vi.hoisted(() => ({ barcode: '' }))
vi.mock('../barcode/BarcodeScanner', () => ({
  BarcodeScanner: ({ onResult }: { onResult: (barcode: string) => void }) => (
    <button type="button" onClick={() => onResult(scanned.barcode)}>
      Fake scan
    </button>
  ),
}))

import { lookupProduct } from '../barcode/openFoodFacts'
import { EMPTY_INGREDIENT_FORM } from './ingredientForm'
import { fetchCategories, fetchCategoryGroups, fetchIngredients } from './ingredientsApi'
import { IngredientsPage } from './IngredientsPage'

const PROFILE = {
  id: 'u1',
  household_id: 'h1',
  display_name: 'Lukas',
  accent_color: '#007aff',
  appearance: {},
  created_at: '',
  updated_at: '',
}
const CATEGORIES = [category('c1', 'Dairy'), category('c2', 'Bakery')]
const INGREDIENTS = [
  ingredient({ id: 'cream', name: 'Cream 7%', brand: 'Milbona', category_id: 'c1', kcal_100: 92 }),
  ingredient({ id: 'cheese', name: 'Käse', category_id: 'c1', kcal_100: 350 }),
  ingredient({ id: 'bread', name: 'Bread', category_id: 'c2', kcal_100: 250 }),
]

function renderPage(appearance: Record<string, string> = {}) {
  return renderWithProviders(
    <CurrentUserContext value={{ profile: { ...PROFILE, appearance }, householdId: 'h1' }}>
      <IngredientsPage />
    </CurrentUserContext>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchIngredients).mockResolvedValue(INGREDIENTS)
  vi.mocked(fetchCategories).mockResolvedValue(CATEGORIES)
  vi.mocked(fetchCategoryGroups).mockResolvedValue([])
})

describe('brand suggestions', () => {
  test('a new ingredient suggests the brands already saved', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Cream 7%')

    await user.click(screen.getByRole('button', { name: 'Add ingredient' }))
    const sheet = within(screen.getByRole('dialog', { name: 'New Ingredient' }))
    await user.type(sheet.getByRole('combobox', { name: 'Brand' }), 'mil')
    await user.click(sheet.getByRole('option', { name: 'Milbona' }))

    expect(sheet.getByRole('combobox', { name: 'Brand' })).toHaveValue('Milbona')
  })
})

describe('scanning on the Ingredients page', () => {
  test('a saved package opens to be looked at or changed', async () => {
    vi.mocked(fetchIngredients).mockResolvedValue([
      ...INGREDIENTS,
      ingredient({ id: 'nutella', name: 'Nutella', kcal_100: 539, barcode: '3017620422003' }),
    ])
    scanned.barcode = '3017620422003'
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Nutella')

    await user.click(screen.getByRole('button', { name: 'Scan barcode' }))
    await user.click(screen.getByRole('button', { name: 'Fake scan' }))

    const sheet = within(screen.getByRole('dialog', { name: 'Edit Ingredient' }))
    expect(sheet.getByLabelText('Name')).toHaveValue('Nutella')
    expect(sheet.getByLabelText('Barcode')).toHaveValue('3017620422003')
  })

  test('a new package opens a new ingredient filled in from Open Food Facts', async () => {
    scanned.barcode = '3017620422003'
    vi.mocked(lookupProduct).mockResolvedValue({
      kind: 'found',
      info: { imageUrl: null, portion: null, pack: null },
      warnings: [],
      values: { ...EMPTY_INGREDIENT_FORM, name: 'Nutella', barcode: '3017620422003' },
    })
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Cream 7%')

    await user.click(screen.getByRole('button', { name: 'Scan barcode' }))
    await user.click(screen.getByRole('button', { name: 'Fake scan' }))

    const sheet = within(screen.getByRole('dialog', { name: 'New Ingredient' }))
    expect(await sheet.findByText(/Filled in from Open Food Facts/)).toBeInTheDocument()
    expect(sheet.getByLabelText('Name')).toHaveValue('Nutella')
    expect(lookupProduct).toHaveBeenCalledWith('3017620422003')
  })

  test('odd product data is pointed out above the form, to check by hand', async () => {
    scanned.barcode = '4260562940916'
    vi.mocked(lookupProduct).mockResolvedValue({
      kind: 'found',
      info: { imageUrl: null, portion: null, pack: null },
      warnings: ['The portion (100 g) is bigger than the pack (50 g).'],
      values: { ...EMPTY_INGREDIENT_FORM, name: 'Low Sugar Gummies', barcode: '4260562940916' },
    })
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Cream 7%')

    await user.click(screen.getByRole('button', { name: 'Scan barcode' }))
    await user.click(screen.getByRole('button', { name: 'Fake scan' }))

    const sheet = within(screen.getByRole('dialog', { name: 'New Ingredient' }))
    const warnings = await sheet.findByRole('list', { name: 'Check the product data' })
    expect(warnings).toHaveTextContent('The portion (100 g) is bigger than the pack (50 g).')
  })

  test('scanning waits for the ingredients, so a saved package is never created twice', async () => {
    vi.mocked(fetchIngredients).mockReturnValue(new Promise(() => {}))
    renderPage()

    expect(screen.getByRole('button', { name: 'Scan barcode' })).toBeDisabled()
  })

  test('the + button still starts an empty ingredient after a scan', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Cream 7%')

    await user.click(screen.getByRole('button', { name: 'Add ingredient' }))

    const sheet = within(screen.getByRole('dialog', { name: 'New Ingredient' }))
    expect(sheet.getByLabelText('Name')).toHaveValue('')
    expect(sheet.getByLabelText('Barcode')).toHaveValue('')
    expect(lookupProduct).not.toHaveBeenCalled()
  })
})

describe('IngredientsPage', () => {
  test('lists ingredients grouped by category with brand and calories', async () => {
    renderPage()

    expect(await screen.findByText('Cream 7%')).toBeInTheDocument()
    expect(fetchIngredients).toHaveBeenCalledWith('h1')
    expect(screen.getByRole('heading', { name: 'Bakery' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Dairy' })).toBeInTheDocument()
    expect(screen.getByText('Milbona · 92 kcal / 100 g')).toBeInTheDocument()
  })

  test('searching filters by name, ignoring accents', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Cream 7%')

    await user.type(screen.getByRole('searchbox', { name: 'Search ingredients' }), 'kase')

    expect(screen.getByText('Käse')).toBeInTheDocument()
    expect(screen.queryByText('Cream 7%')).not.toBeInTheDocument()
  })

  test('category chips filter the list and can be reset', async () => {
    const user = userEvent.setup()
    renderPage()
    const chips = within(await screen.findByRole('group', { name: 'Categories' }))

    await user.click(chips.getByRole('button', { name: 'Bakery' }))

    expect(chips.getByRole('button', { name: 'Bakery' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Bread')).toBeInTheDocument()
    expect(screen.queryByText('Käse')).not.toBeInTheDocument()

    await user.click(chips.getByRole('button', { name: 'All' }))
    expect(screen.getByText('Käse')).toBeInTheDocument()
  })

  test('rapidly switching categories always keeps the header, search and results', async () => {
    const user = userEvent.setup()
    renderPage()
    const chips = within(await screen.findByRole('group', { name: 'Categories' }))

    for (const name of ['Dairy', 'Bakery', 'All', 'Bakery', 'Dairy', 'Bakery']) {
      await user.click(chips.getByRole('button', { name }))
    }

    expect(screen.getByRole('heading', { level: 1, name: 'Ingredients' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search ingredients' })).toBeInTheDocument()
    expect(chips.getByRole('button', { name: 'Bakery' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Bread')).toBeInTheDocument()
    expect(screen.queryByText('Cream 7%')).not.toBeInTheDocument()
  })

  test('category chips scroll sideways on one line by default', async () => {
    renderPage()

    const chips = await screen.findByRole('group', { name: 'Categories' })

    expect(chips).toHaveClass('overflow-x-auto')
    expect(chips).not.toHaveClass('flex-wrap')
  })

  test('with "All on screen" the chips wrap into rows and never scroll sideways', async () => {
    const user = userEvent.setup()
    renderPage({ categoryLayout: 'wrap' })
    const group = await screen.findByRole('group', { name: 'Categories' })

    expect(group).toHaveClass('flex-wrap')
    expect(group).not.toHaveClass('overflow-x-auto')
    expect(group).not.toHaveAttribute('data-swipe-lock')

    await user.click(within(group).getByRole('button', { name: 'Bakery' }))
    expect(screen.getByText('Bread')).toBeInTheDocument()
    expect(screen.queryByText('Käse')).not.toBeInTheDocument()
  })

  test('grouped: a broad category filters the list and opens its categories', async () => {
    vi.mocked(fetchCategories).mockResolvedValue([
      category('c1', 'Dairy', 'g1'),
      category('c2', 'Bakery', 'g2'),
    ])
    vi.mocked(fetchCategoryGroups).mockResolvedValue([
      categoryGroup('g1', 'Fridge'),
      categoryGroup('g2', 'Pantry'),
    ])
    const user = userEvent.setup()
    renderPage({ categoryLayout: 'grouped' })

    await user.click(await screen.findByRole('button', { name: 'Pantry' }))

    expect(screen.getByText('Bread')).toBeInTheDocument()
    expect(screen.queryByText('Käse')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Fridge' }))
    const fridge = within(screen.getByRole('group', { name: 'Fridge categories' }))
    await user.click(fridge.getByRole('button', { name: 'Dairy' }))

    expect(screen.getByText('Käse')).toBeInTheDocument()
    expect(screen.queryByText('Bread')).not.toBeInTheDocument()
  })

  test('says when nothing matches the search', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Cream 7%')

    await user.type(screen.getByRole('searchbox', { name: 'Search ingredients' }), 'pizza')

    expect(screen.getByText('No matches')).toBeInTheDocument()
  })

  test('shows an empty state before the first ingredient', async () => {
    vi.mocked(fetchIngredients).mockResolvedValue([])
    renderPage()

    expect(await screen.findByText('No ingredients yet')).toBeInTheDocument()
  })

  test('shows a retryable error when loading fails', async () => {
    vi.mocked(fetchIngredients)
      .mockRejectedValueOnce(new TypeError('Load failed'))
      .mockResolvedValueOnce(INGREDIENTS)
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('No connection.')
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Cream 7%')).toBeInTheDocument()
  })

  test('the + button opens the new ingredient form', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Add ingredient' }))

    expect(screen.getByRole('dialog', { name: 'New Ingredient' })).toBeInTheDocument()
  })

  test('the form waits for the categories, so the category picker is never wrong', async () => {
    vi.mocked(fetchCategories).mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Add ingredient' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('tapping an ingredient opens it for editing', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /Cream 7%/ }))

    const dialog = within(screen.getByRole('dialog', { name: 'Edit Ingredient' }))
    expect(dialog.getByLabelText('Name')).toHaveValue('Cream 7%')
  })
})
