import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { CurrentUserContext } from '../../app/currentUser'
import { renderWithProviders } from '../../test/render'
import { category, ingredient } from './testData'

vi.mock('./ingredientsApi', () => ({
  fetchIngredients: vi.fn(),
  createIngredient: vi.fn(),
  updateIngredient: vi.fn(),
  deleteIngredient: vi.fn(),
  createCategory: vi.fn(),
  fetchCategories: vi.fn(),
  setIngredientBarcode: vi.fn(),
}))
vi.mock('../barcode/openFoodFacts', () => ({ lookupProduct: vi.fn(), searchProducts: vi.fn() }))

import { lookupProduct, searchProducts } from '../barcode/openFoodFacts'
import { EMPTY_INGREDIENT_FORM, type IngredientFormValues } from './ingredientForm'
import {
  createIngredient,
  fetchIngredients,
  setIngredientBarcode,
  updateIngredient,
  type Ingredient,
} from './ingredientsApi'
import { IngredientSheet } from './IngredientSheet'

const PROFILE = {
  id: 'u1',
  household_id: 'h1',
  display_name: 'Lukas',
  accent_color: '#007aff',
  appearance: {},
  created_at: '',
  updated_at: '',
}
const CATEGORIES = [category('c1', 'Dairy')]
const SKYR = ingredient({
  id: 'skyr',
  name: 'Skyr',
  brand: 'Milbona',
  kcal_100: 62,
  protein_100: 11,
  unit_label: 'cup',
  unit_weight_g: 150,
})
const NO_INFO = { imageUrl: null, portion: null, pack: null }

function renderSheet({
  editing = null,
  barcode = null,
}: { editing?: Ingredient | null; barcode?: string | null } = {}) {
  const onOpenIngredient = vi.fn()
  const result = renderWithProviders(
    <CurrentUserContext value={{ profile: PROFILE, householdId: 'h1' }}>
      <IngredientSheet
        open
        householdId="h1"
        ingredient={editing}
        barcode={barcode}
        categories={CATEGORIES}
        groups={[]}
        onClose={vi.fn()}
        onOpenIngredient={onOpenIngredient}
      />
    </CurrentUserContext>,
  )
  return { ...result, onOpenIngredient }
}

function product(overrides: Partial<IngredientFormValues>): IngredientFormValues {
  return { ...EMPTY_INGREDIENT_FORM, ...overrides }
}

const per100g = (values: Partial<IngredientFormValues['per100g']>) => ({
  ...EMPTY_INGREDIENT_FORM.per100g,
  ...values,
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchIngredients).mockResolvedValue([SKYR])
  vi.mocked(createIngredient).mockResolvedValue(SKYR)
  vi.mocked(updateIngredient).mockResolvedValue(SKYR)
})

describe('clearing values', () => {
  test('a row’s clear button empties just that value', async () => {
    const user = userEvent.setup()
    renderSheet({ editing: SKYR })

    await user.click(screen.getByRole('button', { name: 'Clear Protein per 100 g' }))

    expect(screen.getByLabelText('Protein per 100 g')).toHaveValue('')
    expect(screen.getByLabelText('Calories per 100 g')).toHaveValue('62')
    expect(screen.queryByRole('button', { name: 'Clear Protein per 100 g' })).toBeNull()
  })

  test('a whole section can be cleared, and Undo brings the values back', async () => {
    const user = userEvent.setup()
    renderSheet({ editing: SKYR })

    await user.click(screen.getByRole('button', { name: 'Clear values per 100 g' }))

    expect(screen.getByLabelText('Calories per 100 g')).toHaveValue('')
    expect(screen.getByRole('switch', { name: 'Per 100 g' })).toBeChecked()
    expect(screen.getByText('Cleared 2 values per 100 g')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Undo' }))

    expect(screen.getByLabelText('Calories per 100 g')).toHaveValue('62')
    expect(screen.getByLabelText('Protein per 100 g')).toHaveValue('11')
  })

  test('the unit name and grams per unit have clear buttons too', async () => {
    const user = userEvent.setup()
    renderSheet({ editing: SKYR })

    await user.click(screen.getByRole('button', { name: 'Clear Grams per unit' }))

    expect(screen.getByLabelText('Grams per unit')).toHaveValue('')
  })
})

describe('splitting a portion into units', () => {
  test('a portion of 3 becomes one unit each, with the package’s count suggested', async () => {
    vi.mocked(lookupProduct).mockResolvedValue({
      kind: 'found',
      warnings: [],
      info: { ...NO_INFO, portion: '3 Kekse (30 g)' },
      values: product({
        name: 'Butterkeks',
        barcode: '4017100125005',
        per100gEnabled: true,
        per100g: per100g({ kcal: '440' }),
        perUnitEnabled: true,
        perUnit: per100g({ kcal: '132', protein: '2.1' }),
        unitWeightG: '30',
      }),
    })
    const user = userEvent.setup()
    renderSheet({ barcode: '4017100125005' })

    expect(await screen.findByText('Portion on the package: 3 Kekse (30 g)')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Split into smaller units…' }))
    expect(screen.getByLabelText('Units in one portion')).toHaveValue('3')
    await user.click(screen.getByRole('button', { name: 'Split' }))

    expect(screen.getByLabelText('Calories per unit')).toHaveValue('44')
    expect(screen.getByLabelText('Protein per unit')).toHaveValue('0.7')
    expect(screen.getByLabelText('Grams per unit')).toHaveValue('10')
    expect(screen.getByLabelText('Calories per 100 g')).toHaveValue('440')
    expect(screen.getByText('Split into 3 units')).toBeInTheDocument()
  })
})

describe('safety of the buttons', () => {
  test('Return in the split field splits instead of saving the ingredient', async () => {
    const user = userEvent.setup()
    renderSheet({ editing: { ...SKYR, kcal_unit: 93, unit_weight_g: 150 } })

    await user.click(screen.getByRole('button', { name: 'Split into smaller units…' }))
    await user.type(screen.getByLabelText('Units in one portion'), '3{Enter}')

    expect(screen.getByLabelText('Calories per unit', { selector: 'input' })).toHaveValue('31')
    expect(updateIngredient).not.toHaveBeenCalled()
  })

  test('Undo goes away once something else is typed, so it never reverts that', async () => {
    const user = userEvent.setup()
    renderSheet({ editing: SKYR })

    await user.click(screen.getByRole('button', { name: 'Clear values per 100 g' }))
    await user.type(screen.getByLabelText('Calories per 100 g', { selector: 'input' }), '70')

    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull()
  })

  test('a slow lookup doesn’t undo what was typed while it ran', async () => {
    let answer: (value: Awaited<ReturnType<typeof lookupProduct>>) => void = () => undefined
    vi.mocked(lookupProduct).mockReturnValue(new Promise((resolve) => (answer = resolve)))
    const user = userEvent.setup()
    renderSheet({ editing: { ...SKYR, barcode: '20692285' } })

    await user.click(screen.getByRole('button', { name: 'Fill empty values from Open Food Facts' }))
    await user.type(screen.getByLabelText('Note'), 'from Lidl')
    answer({
      kind: 'found',
      warnings: [],
      info: NO_INFO,
      values: product({ per100gEnabled: true, per100g: per100g({ sugar: '4' }) }),
    })

    expect(await screen.findByText('Filled in 1 value')).toBeInTheDocument()
    expect(screen.getByLabelText('Note')).toHaveValue('from Lidl')
    expect(screen.getByLabelText('Sugar per 100 g', { selector: 'input' })).toHaveValue('4')
  })

  test('resetting to the scanned values asks first', async () => {
    vi.mocked(lookupProduct).mockResolvedValue({
      kind: 'found',
      warnings: [],
      info: NO_INFO,
      values: product({ name: 'Skyr Natur', barcode: '20692285' }),
    })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    renderSheet({ barcode: '20692285' })
    const name = await screen.findByLabelText('Name')
    await user.clear(name)
    await user.type(name, 'My skyr')

    await user.click(
      screen.getByRole('button', { name: 'Reset to the values from Open Food Facts' }),
    )
    expect(confirm).toHaveBeenCalled()
    expect(screen.getByLabelText('Name')).toHaveValue('My skyr')

    confirm.mockReturnValue(true)
    await user.click(
      screen.getByRole('button', { name: 'Reset to the values from Open Food Facts' }),
    )
    expect(screen.getByLabelText('Name')).toHaveValue('Skyr Natur')
  })
})

describe('checking values while typing', () => {
  test('odd values are pointed out and marked, and the note goes away once fixed', async () => {
    const user = userEvent.setup()
    renderSheet()
    await user.click(screen.getByRole('switch', { name: 'Per 100 g' }))
    await user.type(screen.getByLabelText('Carbs per 100 g'), '5')
    await user.type(screen.getByLabelText('Sugar per 100 g'), '8')

    const warnings = screen.getByRole('list', { name: 'Check these values' })
    expect(warnings).toHaveTextContent('More sugar than carbs per 100 g.')

    await user.clear(screen.getByLabelText('Sugar per 100 g'))
    await user.type(screen.getByLabelText('Sugar per 100 g'), '4')

    expect(screen.queryByRole('list', { name: 'Check these values' })).toBeNull()
  })
})

describe('estimates', () => {
  test('calories worked out from the macros mark the ingredient as an estimate', async () => {
    const user = userEvent.setup()
    renderSheet()
    await user.type(screen.getByLabelText('Name'), 'Döner')
    await user.click(screen.getByRole('switch', { name: 'Per 100 g' }))
    await user.type(screen.getByLabelText('Protein per 100 g'), '10')
    await user.type(screen.getByLabelText('Carbs per 100 g'), '20')
    await user.type(screen.getByLabelText('Fat per 100 g'), '10')

    await user.click(screen.getByRole('button', { name: 'Calculate missing values' }))

    expect(screen.getByLabelText('Calories per 100 g')).toHaveValue('210')
    const estimate = screen.getByRole('switch', { name: 'Values are an estimate' })
    expect(estimate).toBeChecked()
    expect(
      screen.getByText(/from protein, carbs and fat: marked as an estimate/),
    ).toBeInTheDocument()

    await user.click(estimate)
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(createIngredient).toHaveBeenCalledWith(
        'h1',
        expect.objectContaining({ kcal_100: 210, kcal_estimated: false }),
      ),
    )
  })
})

describe('filling in values from elsewhere', () => {
  test('copied from a saved ingredient; the typed name stays', async () => {
    const user = userEvent.setup()
    renderSheet()
    await user.type(screen.getByLabelText('Name'), 'Skyr vanilla')

    await user.click(await screen.findByRole('button', { name: 'Copy from an ingredient' }))
    await user.click(await screen.findByRole('button', { name: /^Skyr/ }))

    expect(screen.getByLabelText('Name')).toHaveValue('Skyr vanilla')
    expect(screen.getByLabelText('Calories per 100 g')).toHaveValue('62')
    expect(screen.getByLabelText('Grams per unit')).toHaveValue('150')
    expect(screen.getByText('Copied from Skyr')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.getByRole('switch', { name: 'Per 100 g' })).not.toBeChecked()
  })

  test('a similar product found on Open Food Facts by name', async () => {
    vi.mocked(searchProducts).mockResolvedValue({
      kind: 'found',
      hits: [
        {
          barcode: '20692285',
          warnings: [],
          info: NO_INFO,
          values: product({
            name: 'Laugenbrezel',
            brand: 'Bäcker',
            barcode: '20692285',
            per100gEnabled: true,
            per100g: per100g({ kcal: '270' }),
          }),
        },
      ],
    })
    const user = userEvent.setup()
    renderSheet()
    await user.type(screen.getByLabelText('Name'), 'Brezel')

    await user.click(screen.getByRole('button', { name: 'Search Open Food Facts' }))
    expect(screen.getByRole('searchbox', { name: 'Search Open Food Facts' })).toHaveValue('Brezel')
    await user.click(screen.getByRole('button', { name: 'Search' }))
    await user.click(await screen.findByRole('button', { name: /Laugenbrezel/ }))

    expect(searchProducts).toHaveBeenCalledWith('Brezel')
    expect(screen.getByLabelText('Calories per 100 g')).toHaveValue('270')
    expect(screen.getByLabelText('Name')).toHaveValue('Brezel')
    // a similar product's barcode isn't this package's
    expect(screen.getByLabelText('Barcode')).toHaveValue('')
  })

  test('too many searches are explained', async () => {
    vi.mocked(searchProducts).mockResolvedValue({ kind: 'busy' })
    const user = userEvent.setup()
    renderSheet()

    await user.click(screen.getByRole('button', { name: 'Search Open Food Facts' }))
    await user.type(
      screen.getByRole('searchbox', { name: 'Search Open Food Facts' }),
      'Brezel{Enter}',
    )

    expect(await screen.findByText(/only a few searches a minute/)).toBeInTheDocument()
    expect(createIngredient).not.toHaveBeenCalled()
  })

  test('a saved ingredient’s barcode fills in only what is still empty', async () => {
    vi.mocked(lookupProduct).mockResolvedValue({
      kind: 'found',
      warnings: [],
      info: NO_INFO,
      values: product({
        name: 'Skyr Natur',
        per100gEnabled: true,
        per100g: per100g({ kcal: '63', protein: '11', sugar: '4' }),
      }),
    })
    const user = userEvent.setup()
    renderSheet({ editing: { ...SKYR, barcode: '20692285' } })

    await user.click(screen.getByRole('button', { name: 'Fill empty values from Open Food Facts' }))

    expect(await screen.findByText('Filled in 1 value')).toBeInTheDocument()
    expect(screen.getByLabelText('Sugar per 100 g')).toHaveValue('4')
    expect(screen.getByLabelText('Calories per 100 g')).toHaveValue('62')
    expect(screen.getByLabelText('Name')).toHaveValue('Skyr')
  })
})

describe('an unknown barcode for an ingredient already saved', () => {
  beforeEach(() => {
    vi.mocked(lookupProduct).mockResolvedValue({
      kind: 'found',
      warnings: [],
      info: NO_INFO,
      values: product({ name: 'Skyr Natur', brand: 'Milbona', barcode: '20692285' }),
    })
  })

  test('the likely match is suggested; one tap adds the barcode to it', async () => {
    const linked = { ...SKYR, barcode: '20692285' }
    vi.mocked(setIngredientBarcode).mockResolvedValue(linked)
    const user = userEvent.setup()
    const { onOpenIngredient } = renderSheet({ barcode: '20692285' })

    expect(await screen.findByText('Is this Skyr (Milbona)?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Use Skyr' }))

    await waitFor(() => expect(onOpenIngredient).toHaveBeenCalledWith(linked))
    expect(setIngredientBarcode).toHaveBeenCalledWith('skyr', '20692285')
  })

  test('any saved ingredient can be picked; replacing its barcode is confirmed first', async () => {
    const bread = ingredient({
      id: 'bread',
      name: 'Bread',
      barcode: '4006040000006',
      kcal_100: 250,
    })
    vi.mocked(fetchIngredients).mockResolvedValue([SKYR, bread])
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    renderSheet({ barcode: '20692285' })

    await user.click(await screen.findByRole('button', { name: 'Add to an existing ingredient' }))
    const list = screen.getAllByRole('searchbox', { name: 'Search your ingredients' })[0]
    await user.type(list as HTMLElement, 'bread')
    const rows = within(screen.getByRole('dialog'))
    await user.click(rows.getByRole('button', { name: /^Bread/ }))

    expect(confirm).toHaveBeenCalledWith(expect.stringMatching(/already has a barcode/))
    expect(setIngredientBarcode).not.toHaveBeenCalled()
  })
})
