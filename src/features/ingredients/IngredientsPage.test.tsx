import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { CurrentUserContext } from '../../app/currentUser'
import { renderWithProviders } from '../../test/render'
import { category, categoryGroup, ingredient } from './testData'

vi.mock('../review/reviewApi', () => ({
  fetchOpenFindings: vi.fn().mockResolvedValue([]),
  decideFinding: vi.fn(),
  patchIngredient: vi.fn(),
}))
vi.mock('./ingredientsApi', () => ({
  fetchIngredients: vi.fn(),
  fetchIngredientUses: vi.fn(),
  fetchCategories: vi.fn(),
  fetchCategoryGroups: vi.fn().mockResolvedValue([]),
  createIngredient: vi.fn(),
  updateIngredient: vi.fn(),
  deleteIngredient: vi.fn(),
  createCategory: vi.fn(),
}))

vi.mock('../barcode/openFoodFacts', () => ({ lookupProduct: vi.fn() }))
vi.mock('./applyToRecentMeals', () => ({ applyToRecentMeals: vi.fn() }))
vi.mock('../household/householdApi', () => ({ updateProfile: vi.fn() }))
const scanned = vi.hoisted(() => ({ barcode: '' }))
vi.mock('../barcode/BarcodeScanner', () => ({
  BarcodeScanner: ({ onResult }: { onResult: (barcode: string) => void }) => (
    <button type="button" onClick={() => onResult(scanned.barcode)}>
      Fake scan
    </button>
  ),
}))

import { lookupProduct } from '../barcode/openFoodFacts'
import { applyToRecentMeals } from './applyToRecentMeals'
import { EMPTY_INGREDIENT_FORM } from './ingredientForm'
import { updateProfile } from '../household/householdApi'
import {
  fetchCategories,
  fetchCategoryGroups,
  fetchIngredientUses,
  createIngredient,
  fetchIngredients,
  updateIngredient,
} from './ingredientsApi'
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
  ingredient({
    id: 'cream',
    name: 'Cream 7%',
    brand: 'Milbona',
    category_id: 'c1',
    kcal_100: 92,
    created_at: '2026-10-02T10:00:00Z',
  }),
  ingredient({
    id: 'cheese',
    name: 'Käse',
    category_id: 'c1',
    kcal_100: 350,
    created_at: '2026-10-01T10:00:00Z',
  }),
  ingredient({
    id: 'bread',
    name: 'Bread',
    category_id: 'c2',
    kcal_100: 250,
    created_at: '2026-10-03T10:00:00Z',
  }),
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
  vi.mocked(fetchIngredientUses).mockResolvedValue({})
  vi.mocked(updateProfile).mockResolvedValue()
})

/** the ingredient names in the order the list shows them */
function shownNames(): (string | undefined)[] {
  const names = INGREDIENTS.map(({ name }) => name)
  return screen
    .getAllByRole('button', { name: /kcal/ })
    .map((row) => names.find((name) => row.textContent?.includes(name)))
}

describe('sorting', () => {
  test('newest first by default: one list, the latest added on top, no category headings', async () => {
    renderPage()
    await screen.findByText('Cream 7%')

    expect(shownNames()).toEqual(['Bread', 'Cream 7%', 'Käse'])
    expect(screen.queryByRole('heading', { name: 'Dairy' })).not.toBeInTheDocument()
  })

  test('A–Z keeps the list grouped by category', async () => {
    renderPage({ ingredientSort: 'name' })
    await screen.findByText('Cream 7%')

    expect(screen.getByRole('heading', { name: 'Bakery' })).toBeInTheDocument()
    expect(shownNames()).toEqual(['Bread', 'Cream 7%', 'Käse'])
  })

  test('most used first', async () => {
    vi.mocked(fetchIngredientUses).mockResolvedValue({ cheese: 4 })
    renderPage({ ingredientSort: 'used' })
    await screen.findByText('Cream 7%')

    await waitFor(() => expect(shownNames()).toEqual(['Käse', 'Bread', 'Cream 7%']))
  })

  test('the order is picked from a menu and saved to the account', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Cream 7%')

    await user.click(screen.getByRole('button', { name: 'Sort: Newest first' }))
    const sheet = within(screen.getByRole('dialog', { name: 'Sort by' }))
    await user.click(sheet.getByRole('button', { name: /Fewest calories/ }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith('u1', {
        appearance: expect.objectContaining({ ingredientSort: 'kcal' }),
      }),
    )
  })
})

describe('brands', () => {
  test('a brand shows above the ingredient’s name, not in the grey line', async () => {
    renderPage()

    const row = await screen.findByRole('button', { name: /Cream 7%/ })
    expect(within(row).getByText('Milbona')).toBeInTheDocument()
    expect(within(row).getByText('92 kcal / 100 g')).toBeInTheDocument()
  })

  test('the list can be filtered by brand, and shows every brand again', async () => {
    vi.mocked(fetchIngredients).mockResolvedValue([
      ...INGREDIENTS,
      ingredient({ id: 'skyr', name: 'Skyr', brand: 'milbona', category_id: 'c1', kcal_100: 62 }),
      ingredient({ id: 'cola', name: 'Cola', brand: 'Coca-Cola', kcal_100: 42 }),
    ])
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Cream 7%')

    await user.click(screen.getByRole('button', { name: 'Brand: All brands' }))
    const sheet = within(screen.getByRole('dialog', { name: 'Brand' }))
    await user.type(sheet.getByRole('searchbox', { name: 'Search brands' }), 'mil')
    expect(sheet.queryByRole('button', { name: /Coca-Cola/ })).not.toBeInTheDocument()
    await user.click(sheet.getByRole('button', { name: /Milbona 2/ }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Cream 7%')).toBeInTheDocument()
    expect(screen.getByText('Skyr')).toBeInTheDocument()
    expect(screen.queryByText('Bread')).not.toBeInTheDocument()
    expect(screen.queryByText('Cola')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show all brands' }))
    expect(screen.getByText('Bread')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Brand: All brands' })).toBeInTheDocument()
  })
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
    renderPage({ ingredientSort: 'name' })

    expect(await screen.findByText('Cream 7%')).toBeInTheDocument()
    expect(fetchIngredients).toHaveBeenCalledWith('h1')
    expect(screen.getByRole('heading', { name: 'Bakery' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Dairy' })).toBeInTheDocument()
    expect(screen.getByText('Milbona')).toBeInTheDocument()
    expect(screen.getByText('92 kcal / 100 g')).toBeInTheDocument()
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

describe('values that look wrong', () => {
  // more saturated fat than fat: can't be right
  const ODD = ingredient({
    id: 'odd',
    name: 'Odd Butter',
    category_id: 'c1',
    kcal_100: 740,
    fat_100: 20,
    sat_fat_100: 50,
  })

  test('are left to the weekly review: no mark in the list and no Check values filter', async () => {
    vi.mocked(fetchIngredients).mockResolvedValue([...INGREDIENTS, ODD])
    renderPage()

    expect(await screen.findByRole('button', { name: /Odd Butter/ })).not.toHaveTextContent(
      'Check values',
    )
    expect(screen.queryByRole('button', { name: /^Check values/ })).not.toBeInTheDocument()
  })
})

describe('editing an ingredient updates recent meals', () => {
  const LUNCH = { userId: 'u1', date: '2026-10-14', mealType: 'lunch' as const }
  const HER_LUNCH = { ...LUNCH, userId: 'u2' }

  async function editCream() {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: /Cream 7%/ }))
    const calories = screen.getByLabelText('Calories per 100 g')
    await user.clear(calories)
    await user.type(calories, '100')
    await user.click(screen.getByRole('button', { name: 'Save' }))
  }

  test('the new values reach the last two weeks’ meals, and a note says how many', async () => {
    // Arrange
    const saved = { ...INGREDIENTS[0]!, kcal_100: 100 }
    vi.mocked(updateIngredient).mockResolvedValue(saved)
    vi.mocked(applyToRecentMeals).mockResolvedValue([LUNCH, HER_LUNCH])

    // Act
    await editCream()

    // Assert
    expect(await screen.findByText('Updated in 2 meals')).toBeInTheDocument()
    const [ingredient, since] = vi.mocked(applyToRecentMeals).mock.lastCall ?? []
    expect(ingredient).toEqual(saved)
    expect(since).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  test('no note when no recent meal had it', async () => {
    vi.mocked(updateIngredient).mockResolvedValue(INGREDIENTS[0]!)
    vi.mocked(applyToRecentMeals).mockResolvedValue([])

    await editCream()

    await waitFor(() => expect(applyToRecentMeals).toHaveBeenCalled())
    expect(screen.queryByText(/^Updated in/)).not.toBeInTheDocument()
  })

  test('says so when the meals couldn’t be updated', async () => {
    vi.mocked(updateIngredient).mockResolvedValue(INGREDIENTS[0]!)
    vi.mocked(applyToRecentMeals).mockRejectedValue(new TypeError('Load failed'))

    await editCream()

    expect(await screen.findByText(/Recent meals weren’t updated/)).toBeInTheDocument()
  })

  test('a new ingredient has no meals to update', async () => {
    const user = userEvent.setup()
    vi.mocked(createIngredient).mockResolvedValue(INGREDIENTS[0]!)
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Add ingredient' }))
    await user.type(screen.getByLabelText('Name'), 'Milk')
    await user.click(screen.getByRole('switch', { name: 'Per 100 g' }))
    await user.type(screen.getByLabelText('Calories per 100 g'), '64')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(createIngredient).toHaveBeenCalled())
    expect(applyToRecentMeals).not.toHaveBeenCalled()
  })
})
