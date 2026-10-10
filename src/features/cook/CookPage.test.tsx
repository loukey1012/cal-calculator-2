import { fireEvent, screen, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { Route, Routes, useLocation } from 'react-router'
import { CurrentUserContext } from '../../app/currentUser'
import { toLocalDateString } from '../../lib/dates'
import { renderWithProviders } from '../../test/render'
import { category, categoryGroup, ingredient } from '../ingredients/testData'

vi.mock('../meals/mealsApi', () => ({
  fetchDay: vi.fn(),
  addMealItem: vi.fn(),
  updateMealItem: vi.fn(),
  deleteMealItem: vi.fn(),
}))
vi.mock('../ingredients/ingredientsApi', () => ({
  fetchIngredients: vi.fn(),
  fetchCategories: vi.fn(),
  fetchCategoryGroups: vi.fn(),
  createIngredient: vi.fn(),
  createCategory: vi.fn(),
  updateIngredient: vi.fn(),
}))
vi.mock('../household/householdApi', () => ({ fetchMembers: vi.fn() }))
vi.mock('../barcode/openFoodFacts', () => ({ lookupProduct: vi.fn() }))
// the camera can't run here: the scanner reports the barcode in `scanned` when tapped
const scanned = vi.hoisted(() => ({ barcode: '' }))
vi.mock('../barcode/BarcodeScanner', () => ({
  BarcodeScanner: ({ onResult }: { onResult: (barcode: string) => void }) => (
    <button type="button" onClick={() => onResult(scanned.barcode)}>
      Fake scan
    </button>
  ),
}))
vi.mock('../dishes/dishesApi', () => ({
  fetchDish: vi.fn(),
  saveDish: vi.fn(),
  deleteDish: vi.fn(),
  fetchLeftoverDishes: vi.fn(),
}))

import { fetchMembers } from '../household/householdApi'
import {
  createIngredient,
  fetchCategories,
  fetchCategoryGroups,
  fetchIngredients,
} from '../ingredients/ingredientsApi'
import { fetchDay } from '../meals/mealsApi'
import { lookupProduct } from '../barcode/openFoodFacts'
import { EMPTY_INGREDIENT_FORM } from '../ingredients/ingredientForm'
import { fetchLeftoverDishes, saveDish } from '../dishes/dishesApi'
import type { Dish } from '../dishes/portions'
import { gramsItem } from '../dishes/testData'
import { CookPage } from './CookPage'
import { CookSession } from './CookSession'

function profile(id: string, name: string) {
  return {
    id,
    household_id: 'h1',
    display_name: name,
    accent_color: '#007aff',
    appearance: {},
    created_at: '',
    updated_at: '',
  }
}
// the nickname I gave her is what Cook shows, not her account name
const ME = {
  ...profile('u1', 'Lukas'),
  appearance: { partnerLooks: { u2: { nickname: 'Schatz' } } },
}
const HER = profile('u2', 'Lisa')

const PATTY = ingredient({
  id: 'patty',
  name: 'Patty',
  kcal_100: 240,
  protein_100: 20,
  category_id: 'c-meat',
})
const TOMATO = ingredient({ id: 'tomato', name: 'Tomato', kcal_100: 18, category_id: 'c-veg' })
const NOODLES = ingredient({ id: 'noodles', name: 'Noodles', kcal_100: 360 })

const CHILI: Dish = {
  id: 'dish-1',
  name: 'Chili',
  splitMode: 'equal',
  cookedWeightG: null,
  revision: 'rev-1',
  portions: [
    {
      id: 'p-me',
      eater: { userId: 'u1', date: '2026-10-01', mealType: 'lunch' },
      splitValue: null,
    },
    { id: 'p-rest', eater: null, splitValue: null },
  ],
  lines: [{ id: 'l-mince', allocation: 'shared', item: gramsItem('Mince', 400, 250), amounts: {} }],
}

function today(): string {
  return toLocalDateString(new Date())
}

function LocationProbe() {
  return <output data-testid="path">{useLocation().pathname}</output>
}

const currentPath = () => screen.getByTestId('path').textContent

function renderCook(route = '/cook', appearance: Record<string, unknown> = {}) {
  const profile = { ...ME, appearance: { ...ME.appearance, ...appearance } }
  return renderWithProviders(
    <CurrentUserContext value={{ profile, householdId: 'h1' }}>
      <CookSession>
        <Routes>
          <Route path="/cook/*" element={<CookPage />} />
          <Route path="/today" element={<p>Today page</p>} />
          <Route path="/history" element={<p>History page</p>} />
        </Routes>
        <LocationProbe />
      </CookSession>
    </CurrentUserContext>,
    { route },
  )
}

async function addIngredient(user: UserEvent, name: string, amount: string) {
  await user.click(screen.getByRole('button', { name: 'Add ingredient' }))
  await user.click(await screen.findByRole('button', { name: new RegExp(name) }))
  await user.type(screen.getByLabelText('Amount'), amount)
  await user.click(screen.getByRole('button', { name: 'Add to dish' }))
}

async function cookWithHer(user: UserEvent) {
  await user.click(await screen.findByRole('button', { name: 'Schatz', pressed: false }))
}

function sentDish(): Dish {
  const call = vi.mocked(saveDish).mock.calls.at(-1)
  if (!call) throw new Error('saveDish was not called')
  return call[0].dish
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  vi.mocked(fetchDay).mockResolvedValue([])
  vi.mocked(fetchIngredients).mockResolvedValue([PATTY, TOMATO, NOODLES])
  vi.mocked(fetchCategories).mockResolvedValue([
    category('c-meat', 'Meat', 'g-fresh'),
    category('c-veg', 'Veggies', 'g-fresh'),
  ])
  vi.mocked(fetchCategoryGroups).mockResolvedValue([categoryGroup('g-fresh', 'Fresh')])
  vi.mocked(fetchMembers).mockResolvedValue([ME, HER])
  vi.mocked(saveDish).mockResolvedValue()
  vi.mocked(fetchLeftoverDishes).mockResolvedValue([])
})

afterEach(() => vi.restoreAllMocks())

describe('cooking alone', () => {
  test('one food for me, saved as a dish into the chosen meal of today', async () => {
    // Arrange
    const user = userEvent.setup()
    renderCook()

    // Act
    expect(await screen.findByRole('button', { name: 'Lukas', pressed: true })).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Snacks' }))
    await addIngredient(user, 'Tomato', '150')
    await user.click(screen.getByRole('button', { name: 'Save meal' }))

    // Assert
    const dish = sentDish()
    expect(dish.portions.map((portion) => portion.eater)).toEqual([
      { userId: 'u1', date: today(), mealType: 'snack' },
    ])
    expect(dish.lines).toEqual([
      expect.objectContaining({
        allocation: 'shared',
        item: expect.objectContaining({ ingredient_id: 'tomato', entered_amount: 150 }),
      }),
    ])
    expect(await screen.findByText('Today page')).toBeInTheDocument()
  })

  test('the meal follows the time of day until one is chosen', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 6, 19, 0))
    renderCook()

    expect(await screen.findByRole('radio', { name: 'Dinner' })).toBeChecked()
    vi.useRealTimers()
  })

  test('a dish needs at least one ingredient', async () => {
    const user = userEvent.setup()
    renderCook()

    await user.click(await screen.findByRole('button', { name: 'Save meal' }))

    expect(screen.getByText('Add at least one ingredient')).toBeInTheDocument()
    expect(saveDish).not.toHaveBeenCalled()
  })

  test('an earlier day can be chosen, but not a future one', async () => {
    // Arrange
    const user = userEvent.setup()
    renderCook()
    const day = await screen.findByLabelText('Day')
    expect(day).toHaveValue(today())
    expect(day).toHaveAttribute('max', today())

    // Act: a future day is ignored, an earlier one taken
    fireEvent.change(day, { target: { value: '2999-01-01' } })
    expect(day).toHaveValue(today())
    fireEvent.change(day, { target: { value: '2026-10-02' } })
    await user.click(screen.getByRole('radio', { name: 'Breakfast' }))
    await addIngredient(user, 'Patty', '100')
    await user.click(screen.getByRole('button', { name: 'Save meal' }))

    // Assert
    expect(sentDish().portions[0]?.eater).toMatchObject({
      date: '2026-10-02',
      mealType: 'breakfast',
    })
  })

  test('a custom one-off food can be added without touching the ingredients', async () => {
    const user = userEvent.setup()
    renderCook()

    await user.click(await screen.findByRole('button', { name: 'Add ingredient' }))
    await user.click(await screen.findByRole('button', { name: /Custom item/ }))
    await user.type(screen.getByLabelText('Name'), 'Soup')
    await user.type(screen.getByLabelText('Calories'), '80')
    await user.type(screen.getByLabelText('Amount'), '300')
    await user.click(screen.getByRole('button', { name: 'Add to dish' }))
    await user.click(screen.getByRole('button', { name: 'Save meal' }))

    expect(sentDish().lines[0]?.item).toMatchObject({
      ingredient_id: null,
      name: 'Soup',
      entered_amount: 300,
    })
  })
})

describe('calories as an estimate', () => {
  test('a meal eaten out is saved marked as an estimate, its totals shown with ~', async () => {
    // Arrange
    const user = userEvent.setup()
    renderCook()

    // Act
    await user.click(await screen.findByRole('button', { name: 'Add ingredient' }))
    await user.click(await screen.findByRole('button', { name: /Custom item/ }))
    await user.type(screen.getByLabelText('Name'), 'Pizza')
    await user.type(screen.getByLabelText('Calories'), '90')
    await user.type(screen.getByLabelText('Amount'), '1000')
    await user.click(screen.getByRole('button', { name: 'Add to dish' }))
    const estimate = screen.getByRole('switch', { name: 'Calories are an estimate' })
    expect(estimate).not.toBeChecked()
    await user.click(estimate)

    // Assert
    expect(estimate).toBeChecked()
    expect(screen.getByTestId('dish-totals')).toHaveTextContent('~900 kcal')
    await user.click(screen.getByRole('button', { name: 'Save meal' }))
    expect(sentDish().kcalEstimated).toBe(true)
  })

  test('an ingredient marked as an estimate marks the dish; it can still be switched off', async () => {
    const pizza = ingredient({
      id: 'pizza',
      name: 'Pizza from Luigi',
      kcal_unit: 900,
      unit_label: 'pizza',
      kcal_estimated: true,
    })
    vi.mocked(fetchIngredients).mockResolvedValue([PATTY, pizza])
    const user = userEvent.setup()
    renderCook()

    await user.click(await screen.findByRole('button', { name: 'Add ingredient' }))
    await user.click(await screen.findByRole('button', { name: /Pizza from Luigi/ }))
    await user.click(screen.getByRole('button', { name: '1/2' }))
    expect(screen.getByLabelText('Amount')).toHaveValue('1/2')
    await user.click(screen.getByRole('button', { name: 'Add to dish' }))

    const estimate = screen.getByRole('switch', { name: 'Calories are an estimate' })
    expect(estimate).toBeChecked()
    expect(screen.getByText('Pizza from Luigi is marked as an estimate.')).toBeInTheDocument()
    expect(screen.getByTestId('dish-totals')).toHaveTextContent('~450 kcal')
    await user.click(estimate)
    await user.click(screen.getByRole('button', { name: 'Save meal' }))
    expect(sentDish().kcalEstimated).toBe(false)
  })

  test('a dish is exact unless marked', async () => {
    const user = userEvent.setup()
    renderCook()

    await addIngredient(user, 'Patty', '100')
    await user.click(screen.getByRole('button', { name: 'Save meal' }))

    expect(sentDish().kcalEstimated).toBe(false)
    expect(screen.queryByText(/~/)).not.toBeInTheDocument()
  })
})

describe('cooking together', () => {
  test('a burger: shared patty, tomato only for her, saved for both', async () => {
    // Arrange
    const user = userEvent.setup()
    renderCook()

    // Act
    await cookWithHer(user)
    await user.click(screen.getByRole('radio', { name: 'Lunch' }))
    await user.type(screen.getByLabelText('Dish name (optional)'), 'Burger')
    await addIngredient(user, 'Patty', '250')
    await user.click(screen.getByRole('button', { name: 'Add ingredient' }))
    await user.click(await screen.findByRole('button', { name: /Tomato/ }))
    await user.click(screen.getByRole('radio', { name: 'Only Schatz' }))
    await user.type(screen.getByLabelText('Amount'), '20')
    await user.click(screen.getByRole('button', { name: 'Add to dish' }))

    // Assert: both totals before saving
    const totals = screen.getByTestId('dish-totals')
    expect(within(totals).getByText('Lukas').closest('div')?.parentElement).toHaveTextContent(
      '300 kcal',
    )
    expect(screen.getByRole('button', { name: /Tomato.*only Schatz/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save meal' }))
    const dish = sentDish()
    expect(dish.name).toBe('Burger')
    expect(dish.portions.map((portion) => portion.eater)).toEqual([
      { userId: 'u1', date: today(), mealType: 'lunch' },
      { userId: 'u2', date: today(), mealType: 'lunch' },
    ])
    const herPortion = dish.portions[1]!.id
    expect(dish.lines[1]).toMatchObject({
      allocation: 'per_portion',
      amounts: { [herPortion]: 20 },
    })
  })

  test('own amounts per person: 120 g and 100 g of noodles', async () => {
    const user = userEvent.setup()
    renderCook()

    await cookWithHer(user)
    await user.click(screen.getByRole('button', { name: 'Add ingredient' }))
    await user.click(await screen.findByRole('button', { name: /Noodles/ }))
    await user.click(await screen.findByRole('radio', { name: 'Own amounts' }))
    await user.type(screen.getByLabelText('Lukas amount'), '120')
    await user.type(screen.getByLabelText('Schatz amount'), '100')
    await user.click(screen.getByRole('button', { name: 'Add to dish' }))
    await user.click(screen.getByRole('button', { name: 'Save meal' }))

    const dish = sentDish()
    const [mine, hers] = dish.portions.map((portion) => portion.id)
    expect(dish.lines[0]).toMatchObject({
      allocation: 'per_portion',
      amounts: { [mine!]: 120, [hers!]: 100 },
    })
  })

  test('count split: I have 3, she has 2', async () => {
    const user = userEvent.setup()
    renderCook()

    await cookWithHer(user)
    await addIngredient(user, 'Patty', '500')
    await user.click(screen.getByRole('radio', { name: 'Count' }))
    await user.clear(screen.getByLabelText('Lukas count'))
    await user.type(screen.getByLabelText('Lukas count'), '3')
    await user.clear(screen.getByLabelText('Schatz count'))
    await user.type(screen.getByLabelText('Schatz count'), '2')

    // 1200 kcal in the pot: 720 for me, 480 for her
    expect(screen.getByTestId('dish-totals')).toHaveTextContent(/Lukas.*720 kcal/)
    expect(screen.getByTestId('dish-totals')).toHaveTextContent(/Schatz.*480 kcal/)
    await user.click(screen.getByRole('button', { name: 'Save meal' }))
    expect(sentDish().portions.map((portion) => portion.splitValue)).toEqual([3, 2])
  })

  test('an impossible split says why and is not saved', async () => {
    const user = userEvent.setup()
    renderCook()

    await cookWithHer(user)
    await addIngredient(user, 'Patty', '100')
    await user.click(screen.getByRole('radio', { name: '%' }))
    await user.clear(screen.getByLabelText('Lukas percent'))
    await user.type(screen.getByLabelText('Lukas percent'), '60')
    await user.click(screen.getByRole('button', { name: 'Save meal' }))

    expect(screen.getAllByText('The percentages add up to more than 100 %').length).toBeGreaterThan(
      0,
    )
    expect(saveDish).not.toHaveBeenCalled()
  })

  test('removing her asks first when she has ingredients of her own', async () => {
    // Arrange
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    renderCook()
    await cookWithHer(user)
    await user.click(screen.getByRole('button', { name: 'Add ingredient' }))
    await user.click(await screen.findByRole('button', { name: /Tomato/ }))
    await user.click(screen.getByRole('radio', { name: 'Only Schatz' }))
    await user.type(screen.getByLabelText('Amount'), '20')
    await user.click(screen.getByRole('button', { name: 'Add to dish' }))

    // Act
    await user.click(screen.getByRole('button', { name: 'Schatz', pressed: true }))

    // Assert: declined, nothing changed
    expect(confirm).toHaveBeenCalledWith(
      'Remove Schatz? Ingredients only Schatz has are removed too.',
    )
    expect(screen.getByRole('button', { name: 'Schatz', pressed: true })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tomato/ })).toBeInTheDocument()
  })

  test('cooking one portion more keeps it as a leftover', async () => {
    const user = userEvent.setup()
    renderCook()

    await cookWithHer(user)
    await user.click(screen.getByRole('button', { name: 'More leftover portions' }))
    await addIngredient(user, 'Patty', '300')

    // 720 kcal in the pot: a third each
    expect(screen.getByTestId('dish-totals')).toHaveTextContent(/Leftover.*240 kcal/)
    await user.click(screen.getByRole('button', { name: 'Save meal' }))
    expect(sentDish().portions.map((portion) => portion.eater?.userId ?? null)).toEqual([
      'u1',
      'u2',
      null,
    ])
  })
})

describe('the draft', () => {
  test('survives leaving the page', async () => {
    // Arrange
    const user = userEvent.setup()
    const first = renderCook()
    await addIngredient(user, 'Patty', '100')

    // Act
    first.unmount()
    renderCook()

    // Assert
    expect(await screen.findByRole('button', { name: /Patty/ })).toBeInTheDocument()
  })

  test('is cleared after saving', async () => {
    const user = userEvent.setup()
    const first = renderCook()
    await addIngredient(user, 'Patty', '100')
    await user.click(screen.getByRole('button', { name: 'Save meal' }))
    await screen.findByText('Today page')

    first.unmount()
    renderCook()

    await screen.findByRole('button', { name: 'Add ingredient' })
    expect(screen.queryByRole('button', { name: /Patty/ })).not.toBeInTheDocument()
  })

  test('can be discarded', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    renderCook()
    await addIngredient(user, 'Patty', '100')

    await user.click(screen.getByRole('button', { name: 'Discard' }))

    expect(screen.queryByRole('button', { name: /Patty/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Discard' })).not.toBeInTheDocument()
  })
})

describe('steps', () => {
  test('each step is its own page: the dish, the search, the amount', async () => {
    const user = userEvent.setup()
    renderCook()

    await user.click(await screen.findByRole('button', { name: 'Add ingredient' }))
    expect(currentPath()).toBe('/cook/add')
    await user.click(await screen.findByRole('button', { name: /Patty/ }))
    expect(currentPath()).toBe('/cook/add/patty')
    await user.type(screen.getByLabelText('Amount'), '100')
    await user.click(screen.getByRole('button', { name: 'Add to dish' }))

    expect(currentPath()).toBe('/cook')
    expect(screen.getByRole('button', { name: /Patty/ })).toBeInTheDocument()
  })

  test('Back on the amount goes back to the search, which still shows what was searched', async () => {
    // Arrange
    const user = userEvent.setup()
    renderCook()
    await user.click(await screen.findByRole('button', { name: 'Add ingredient' }))
    await user.type(screen.getByLabelText('Search ingredients'), 'pat')
    await user.click(await screen.findByRole('button', { name: /Patty/ }))

    // Act
    await user.click(screen.getByRole('button', { name: 'Back' }))

    // Assert
    expect(currentPath()).toBe('/cook/add')
    expect(screen.getByLabelText('Search ingredients')).toHaveValue('pat')
    expect(screen.queryByRole('button', { name: /Tomato/ })).not.toBeInTheDocument()
  })

  test('Back on the search goes back to the dish', async () => {
    const user = userEvent.setup()
    renderCook()
    await user.click(await screen.findByRole('button', { name: 'Add ingredient' }))

    await user.click(screen.getByRole('button', { name: 'Back' }))

    expect(currentPath()).toBe('/cook')
    expect(screen.getByRole('button', { name: 'Add ingredient' })).toBeInTheDocument()
  })

  test('a new search starts empty', async () => {
    const user = userEvent.setup()
    renderCook()
    await user.click(await screen.findByRole('button', { name: 'Add ingredient' }))
    await user.type(screen.getByLabelText('Search ingredients'), 'pat')
    await user.click(screen.getByRole('button', { name: 'Back' }))

    await user.click(screen.getByRole('button', { name: 'Add ingredient' }))

    expect(screen.getByLabelText('Search ingredients')).toHaveValue('')
  })

  test('an ingredient line opens as its own page and Back returns to the dish', async () => {
    const user = userEvent.setup()
    renderCook()
    await addIngredient(user, 'Patty', '100')

    await user.click(screen.getByRole('button', { name: /Patty/ }))
    expect(currentPath()).toMatch(/^\/cook\/line-/)
    await user.click(screen.getByRole('button', { name: 'Back' }))

    expect(currentPath()).toBe('/cook')
  })

  test('an opened ingredient that is no longer there says so', async () => {
    renderCook('/cook/add/gone')

    expect(await screen.findByText('This ingredient is no longer available.')).toBeInTheDocument()
  })
})

/** The server creates Feta, and lists it from then on. */
function createsFeta() {
  const feta = ingredient({ id: 'feta', name: 'Feta', kcal_100: 264 })
  vi.mocked(createIngredient).mockImplementation(async () => {
    vi.mocked(fetchIngredients).mockResolvedValue([PATTY, TOMATO, NOODLES, feta])
    return feta
  })
}

describe('the ingredient search', () => {
  test('a missing ingredient is created right there and goes straight to its amount', async () => {
    // Arrange
    createsFeta()
    const user = userEvent.setup()
    renderCook()
    await user.click(await screen.findByRole('button', { name: 'Add ingredient' }))
    await user.type(screen.getByLabelText('Search ingredients'), ' Feta ')
    expect(await screen.findByText('No matches.')).toBeInTheDocument()

    // Act: the name searched for is already filled in
    await user.click(screen.getByRole('button', { name: /New ingredient/ }))
    expect(currentPath()).toBe('/cook/add/new')
    expect(screen.getByLabelText('Name')).toHaveValue('Feta')
    await user.click(screen.getByRole('switch', { name: 'Per 100 g' }))
    await user.type(screen.getByLabelText('Calories per 100 g'), '264')
    await user.click(screen.getByRole('button', { name: 'Save ingredient' }))

    // Assert: saved to the shared ingredients, then on to the amount
    expect(createIngredient).toHaveBeenCalledWith(
      'h1',
      expect.objectContaining({ name: 'Feta', kcal_100: 264 }),
    )
    expect(await screen.findByLabelText('Amount')).toBeInTheDocument()
    expect(currentPath()).toBe('/cook/add/feta')
    await user.type(screen.getByLabelText('Amount'), '50')
    await user.click(screen.getByRole('button', { name: 'Add to dish' }))
    expect(screen.getByRole('button', { name: /Feta/ })).toBeInTheDocument()
  })

  test('Back from the new ingredient’s amount leads to the search, not to the form', async () => {
    createsFeta()
    const user = userEvent.setup()
    renderCook()
    await user.click(await screen.findByRole('button', { name: 'Add ingredient' }))
    await user.click(screen.getByRole('button', { name: /New ingredient/ }))
    await user.type(screen.getByLabelText('Name'), 'Feta')
    await user.click(screen.getByRole('switch', { name: 'Per 100 g' }))
    await user.type(screen.getByLabelText('Calories per 100 g'), '264')
    await user.click(screen.getByRole('button', { name: 'Save ingredient' }))
    await screen.findByLabelText('Amount')

    await user.click(screen.getByRole('button', { name: 'Back' }))

    expect(currentPath()).toBe('/cook/add')
  })

  test('scanning a package already saved goes straight to its amount', async () => {
    vi.mocked(fetchIngredients).mockResolvedValue([
      PATTY,
      { ...TOMATO, barcode: '3017620422003' },
      NOODLES,
    ])
    scanned.barcode = '3017620422003'
    const user = userEvent.setup()
    renderCook()
    await user.click(await screen.findByRole('button', { name: 'Add ingredient' }))
    await screen.findByRole('button', { name: /Patty/ })

    await user.click(screen.getByRole('button', { name: 'Scan barcode' }))
    await user.click(screen.getByRole('button', { name: 'Fake scan' }))

    expect(await screen.findByLabelText('Amount')).toBeInTheDocument()
    expect(currentPath()).toBe('/cook/add/tomato')
    expect(lookupProduct).not.toHaveBeenCalled()
  })

  test('a new package is filled in from Open Food Facts, saved with its barcode, then its amount', async () => {
    // Arrange
    scanned.barcode = '3017620422003'
    vi.mocked(lookupProduct).mockResolvedValue({
      kind: 'found',
      info: { imageUrl: null, portion: null, pack: null },
      warnings: [],
      values: {
        ...EMPTY_INGREDIENT_FORM,
        name: 'Nutella',
        brand: 'Ferrero',
        barcode: '3017620422003',
        per100gEnabled: true,
        per100g: { ...EMPTY_INGREDIENT_FORM.per100g, kcal: '539', fat: '30.9' },
      },
    })
    const nutella = ingredient({ id: 'nutella', name: 'Nutella', kcal_100: 539 })
    vi.mocked(createIngredient).mockImplementation(async () => {
      vi.mocked(fetchIngredients).mockResolvedValue([PATTY, TOMATO, NOODLES, nutella])
      return nutella
    })
    const user = userEvent.setup()
    renderCook()
    await user.click(await screen.findByRole('button', { name: 'Add ingredient' }))

    // Act
    await user.click(screen.getByRole('button', { name: 'Scan barcode' }))
    await user.click(screen.getByRole('button', { name: 'Fake scan' }))

    // Assert: checked by me first, then saved
    expect(await screen.findByText(/Filled in from Open Food Facts/)).toBeInTheDocument()
    expect(currentPath()).toBe('/cook/add/new-3017620422003')
    expect(screen.getByLabelText('Name')).toHaveValue('Nutella')
    expect(screen.getByLabelText('Barcode')).toHaveValue('3017620422003')
    await user.click(screen.getByRole('button', { name: 'Save ingredient' }))
    expect(createIngredient).toHaveBeenCalledWith(
      'h1',
      expect.objectContaining({
        name: 'Nutella',
        kcal_100: 539,
        fat_100: 30.9,
        barcode: '3017620422003',
      }),
    )
    expect(await screen.findByLabelText('Amount')).toBeInTheDocument()
    expect(currentPath()).toBe('/cook/add/nutella')
  })

  test('a package Open Food Facts doesn’t know keeps its barcode and the search as name', async () => {
    scanned.barcode = '96385074'
    vi.mocked(lookupProduct).mockResolvedValue({ kind: 'notFound' })
    const user = userEvent.setup()
    renderCook()
    await user.click(await screen.findByRole('button', { name: 'Add ingredient' }))
    await user.type(screen.getByLabelText('Search ingredients'), 'Rye bread')

    await user.click(screen.getByRole('button', { name: 'Scan barcode' }))
    await user.click(screen.getByRole('button', { name: 'Fake scan' }))

    expect(await screen.findByText(/isn’t in Open Food Facts yet/)).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveValue('Rye bread')
    expect(screen.getByLabelText('Barcode')).toHaveValue('96385074')
  })

  test('a new ingredient with missing values is not saved', async () => {
    const user = userEvent.setup()
    renderCook()
    await user.click(await screen.findByRole('button', { name: 'Add ingredient' }))
    await user.click(screen.getByRole('button', { name: /New ingredient/ }))

    await user.click(screen.getByRole('button', { name: 'Save ingredient' }))

    expect(screen.getByText('Enter a name')).toBeInTheDocument()
    expect(createIngredient).not.toHaveBeenCalled()
    expect(currentPath()).toBe('/cook/add/new')
  })

  test('category chips filter the search, and stay chosen after looking at an amount', async () => {
    // Arrange
    const user = userEvent.setup()
    renderCook()
    await user.click(await screen.findByRole('button', { name: 'Add ingredient' }))
    const chips = within(await screen.findByRole('group', { name: 'Categories' }))

    // Act
    await user.click(chips.getByRole('button', { name: 'Veggies' }))

    // Assert
    expect(screen.getByRole('button', { name: /Tomato/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Patty/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Tomato/ }))
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(
      within(screen.getByRole('group', { name: 'Categories' })).getByRole('button', {
        name: 'Veggies',
      }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  test('the chips follow the chosen layout, e.g. grouped', async () => {
    const user = userEvent.setup()
    renderCook('/cook', { categoryLayout: 'grouped' })
    await user.click(await screen.findByRole('button', { name: 'Add ingredient' }))

    await user.click(await screen.findByRole('button', { name: 'Fresh' }))

    expect(screen.getByRole('button', { name: /Patty/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Noodles/ })).not.toBeInTheDocument()
  })

  test('a new search starts with all categories again', async () => {
    const user = userEvent.setup()
    renderCook()
    await user.click(await screen.findByRole('button', { name: 'Add ingredient' }))
    const chips = within(await screen.findByRole('group', { name: 'Categories' }))
    await user.click(chips.getByRole('button', { name: 'Veggies' }))
    await user.click(screen.getByRole('button', { name: 'Back' }))

    await user.click(screen.getByRole('button', { name: 'Add ingredient' }))

    expect(await screen.findByRole('button', { name: /Noodles/ })).toBeInTheDocument()
  })
})

describe('opened from an empty meal', () => {
  test('starts with that person, day and meal, and returns there after saving', async () => {
    // Arrange
    const user = userEvent.setup()
    renderCook('/cook?person=u2&date=2026-10-04&meal=dinner&from=%2Fhistory')

    // Assert: set up for her dinner on that day
    expect(await screen.findByRole('button', { name: 'Schatz', pressed: true })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lukas', pressed: false })).toBeInTheDocument()
    expect(screen.getByLabelText('Day')).toHaveValue('2026-10-04')
    expect(screen.getByRole('radio', { name: 'Dinner' })).toBeChecked()

    // Act
    await addIngredient(user, 'Patty', '100')
    await user.click(screen.getByRole('button', { name: 'Save meal' }))

    // Assert
    expect(sentDish().portions.map((portion) => portion.eater)).toEqual([
      { userId: 'u2', date: '2026-10-04', mealType: 'dinner' },
    ])
    expect(await screen.findByText('History page')).toBeInTheDocument()
  })
})

describe('leftovers', () => {
  test('a leftover of a dish marked as an estimate shows ~ before its calories', async () => {
    vi.mocked(fetchLeftoverDishes).mockResolvedValue([{ ...CHILI, kcalEstimated: true }])
    const user = userEvent.setup()
    renderCook()

    await user.click(await screen.findByRole('button', { name: /Chili.*~500 kcal/ }))

    expect(
      within(screen.getByRole('dialog', { name: 'Chili' })).getByText(/~500 kcal/),
    ).toBeVisible()
  })

  test('a leftover can be eaten in a meal', async () => {
    // Arrange
    vi.mocked(fetchLeftoverDishes).mockResolvedValue([CHILI])
    const user = userEvent.setup()
    renderCook()

    // Act: half of 400 g mince at 250 kcal
    await user.click(await screen.findByRole('button', { name: /Chili.*500 kcal/ }))
    const sheet = within(screen.getByRole('dialog', { name: 'Chili' }))
    await user.click(sheet.getByRole('radio', { name: 'Dinner' }))
    await user.click(sheet.getByRole('button', { name: 'Add to meal' }))

    // Assert
    expect(sentDish().portions.find((portion) => portion.id === 'p-rest')?.eater).toEqual({
      userId: 'u1',
      date: today(),
      mealType: 'dinner',
    })
    expect(vi.mocked(saveDish).mock.calls[0]?.[0].baseRevision).toBe('rev-1')
  })

  test('a leftover can be thrown away', async () => {
    vi.mocked(fetchLeftoverDishes).mockResolvedValue([CHILI])
    const user = userEvent.setup()
    renderCook()

    await user.click(await screen.findByRole('button', { name: /Chili/ }))
    const sheet = within(screen.getByRole('dialog', { name: 'Chili' }))
    await user.click(sheet.getByRole('button', { name: 'Throw away' }))

    expect(sentDish().portions.find((portion) => portion.id === 'p-rest')).toMatchObject({
      eater: null,
      discarded: true,
    })
  })
})
