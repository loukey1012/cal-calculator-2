import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { renderWithProviders } from '../../test/render'
import { category, categoryGroup, ingredient } from './testData'

vi.mock('./ingredientsApi', () => ({
  createIngredient: vi.fn(),
  updateIngredient: vi.fn(),
  deleteIngredient: vi.fn(),
  createCategory: vi.fn(),
  fetchCategories: vi.fn(),
}))

import { IngredientSheet } from './IngredientSheet'
import { ApiError } from '../../lib/errors'
import {
  createCategory,
  createIngredient,
  deleteIngredient,
  fetchCategories,
  updateIngredient,
} from './ingredientsApi'
import type { Ingredient } from './ingredientsApi'

const GROUPS = [categoryGroup('g1', 'Dairy & Spreads'), categoryGroup('g2', 'Snacks & Drinks')]
const CATEGORIES = [category('c1', 'Dairy', 'g1')]
const CREAM = ingredient({ id: 'i1', name: 'Cream', category_id: 'c1', kcal_100: 92 })

function renderSheet(editing: Ingredient | null = null) {
  const onClose = vi.fn()
  const result = renderWithProviders(
    <IngredientSheet
      open
      householdId="h1"
      ingredient={editing}
      categories={CATEGORIES}
      groups={GROUPS}
      onClose={onClose}
    />,
  )
  return { ...result, onClose }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(createIngredient).mockResolvedValue(CREAM)
  vi.mocked(updateIngredient).mockResolvedValue(CREAM)
  vi.mocked(deleteIngredient).mockResolvedValue()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('IngredientSheet', () => {
  test('creates an ingredient with per-100 g values and closes', async () => {
    const user = userEvent.setup()
    const { onClose } = renderSheet()

    await user.type(screen.getByLabelText('Name'), 'Cream')
    await user.type(screen.getByLabelText('Brand'), 'Milbona')
    await user.click(screen.getByRole('switch', { name: 'Per 100 g' }))
    await user.type(screen.getByLabelText('Calories per 100 g'), '92,4')
    await user.type(screen.getByLabelText('Protein per 100 g'), '1,3')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(createIngredient).toHaveBeenCalledWith(
      'h1',
      expect.objectContaining({
        name: 'Cream',
        brand: 'Milbona',
        category_id: null,
        kcal_100: 93,
        protein_100: 1.3,
        kcal_unit: null,
      }),
    )
  })

  test('per-unit values with unit name and grams per unit', async () => {
    const user = userEvent.setup()
    renderSheet()

    await user.type(screen.getByLabelText('Name'), 'Protein bar')
    await user.click(screen.getByRole('switch', { name: 'Per unit' }))
    await user.type(screen.getByLabelText('Calories per unit'), '210')
    await user.type(screen.getByLabelText('Unit name'), 'bar')
    await user.type(screen.getByLabelText('Grams per unit'), '60')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(createIngredient).toHaveBeenCalledWith(
        'h1',
        expect.objectContaining({ kcal_unit: 210, unit_label: 'bar', unit_weight_g: 60 }),
      ),
    )
  })

  test('Calculate fills the empty per-100 g values from the unit, once its weight is known', async () => {
    const user = userEvent.setup()
    renderSheet()
    await user.type(screen.getByLabelText('Name'), 'Protein bar')
    await user.click(screen.getByRole('switch', { name: 'Per unit' }))
    await user.type(screen.getByLabelText('Calories per unit'), '210')
    await user.type(screen.getByLabelText('Protein per unit'), '20')
    const calculate = screen.getByRole('button', { name: 'Calculate missing values' })
    expect(calculate).toBeDisabled()

    await user.type(screen.getByLabelText('Grams per unit'), '60')
    await user.click(calculate)

    expect(screen.getByRole('switch', { name: 'Per 100 g' })).toBeChecked()
    expect(screen.getByLabelText('Calories per 100 g')).toHaveValue('350')
    expect(screen.getByLabelText('Protein per 100 g')).toHaveValue('33.33')
    expect(screen.getByText('Filled in 2 values.')).toBeInTheDocument()
    await user.click(calculate)
    expect(
      screen.getByText('Nothing to calculate: every value is filled in or unknown.'),
    ).toBeInTheDocument()
  })

  test('shows what is missing instead of saving', async () => {
    const user = userEvent.setup()
    renderSheet()

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByText('Enter a name')).toBeInTheDocument()
    expect(screen.getByText('Add calories per 100 g or per unit')).toBeInTheDocument()
    expect(createIngredient).not.toHaveBeenCalled()
  })

  test('creates a new category on the fly', async () => {
    vi.mocked(createCategory).mockResolvedValue(category('c9', 'Snacks'))
    const user = userEvent.setup()
    renderSheet()

    await user.type(screen.getByLabelText('Name'), 'Chips')
    await user.selectOptions(screen.getByLabelText('Category'), 'New category…')
    await user.type(screen.getByLabelText('New category name'), 'Snacks')
    await user.click(screen.getByRole('switch', { name: 'Per 100 g' }))
    await user.type(screen.getByLabelText('Calories per 100 g'), '540')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(createIngredient).toHaveBeenCalledWith(
        'h1',
        expect.objectContaining({ category_id: 'c9' }),
      ),
    )
    expect(createCategory).toHaveBeenCalledWith('h1', 'Snacks', null)
  })

  test('a new category goes into the chosen broad category', async () => {
    vi.mocked(createCategory).mockResolvedValue(category('c9', 'Chips', 'g2'))
    const user = userEvent.setup()
    renderSheet()

    await user.type(screen.getByLabelText('Name'), 'Chips')
    await user.selectOptions(screen.getByLabelText('Category'), 'New category…')
    await user.type(screen.getByLabelText('New category name'), 'Chips')
    // by value: user-event compares labels as HTML, where "&" is escaped
    await user.selectOptions(screen.getByLabelText('Broad category'), 'g2')
    await user.click(screen.getByRole('switch', { name: 'Per 100 g' }))
    await user.type(screen.getByLabelText('Calories per 100 g'), '540')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(createCategory).toHaveBeenCalledWith('h1', 'Chips', 'g2'))
  })

  test('the broad category picker only shows for a new category', async () => {
    const user = userEvent.setup()
    renderSheet()

    expect(screen.queryByLabelText('Broad category')).not.toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Category'), 'New category…')
    expect(screen.getByLabelText('Broad category')).toHaveDisplayValue('None (Other)')
  })

  test('a "new" category that already exists is reused', async () => {
    const user = userEvent.setup()
    renderSheet()

    await user.type(screen.getByLabelText('Name'), 'Milk')
    await user.selectOptions(screen.getByLabelText('Category'), 'New category…')
    await user.type(screen.getByLabelText('New category name'), 'dairy')
    await user.click(screen.getByRole('switch', { name: 'Per 100 g' }))
    await user.type(screen.getByLabelText('Calories per 100 g'), '64')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(createIngredient).toHaveBeenCalledWith(
        'h1',
        expect.objectContaining({ category_id: 'c1' }),
      ),
    )
    expect(createCategory).not.toHaveBeenCalled()
  })

  test('a new category that already exists in the database (e.g. after a failed save) is reused', async () => {
    vi.mocked(createCategory).mockRejectedValue(new ApiError('duplicate key', '23505'))
    vi.mocked(fetchCategories).mockResolvedValue([...CATEGORIES, category('c7', 'Snacks')])
    const user = userEvent.setup()
    renderSheet()

    await user.type(screen.getByLabelText('Name'), 'Chips')
    await user.selectOptions(screen.getByLabelText('Category'), 'New category…')
    await user.type(screen.getByLabelText('New category name'), 'snacks')
    await user.click(screen.getByRole('switch', { name: 'Per 100 g' }))
    await user.type(screen.getByLabelText('Calories per 100 g'), '540')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(createIngredient).toHaveBeenCalledWith(
        'h1',
        expect.objectContaining({ category_id: 'c7' }),
      ),
    )
    expect(fetchCategories).toHaveBeenCalledWith('h1')
  })

  test('Save and Delete are disabled while the other is running', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(deleteIngredient).mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    renderSheet(CREAM)

    await user.click(screen.getByRole('button', { name: 'Delete Ingredient' }))

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  test('the missing-calories error is announced on the switch', async () => {
    const user = userEvent.setup()
    renderSheet()

    await user.click(screen.getByRole('button', { name: 'Save' }))

    const toggle = screen.getByRole('switch', { name: 'Per 100 g' })
    expect(toggle).toHaveAttribute('aria-invalid', 'true')
    expect(toggle).toHaveAccessibleDescription('Add calories per 100 g or per unit')
  })

  test('edits an existing ingredient', async () => {
    const user = userEvent.setup()
    const { onClose } = renderSheet(CREAM)

    expect(screen.getByRole('dialog', { name: 'Edit Ingredient' })).toBeInTheDocument()
    expect(screen.getByLabelText('Calories per 100 g')).toHaveValue('92')
    await user.clear(screen.getByLabelText('Name'))
    await user.type(screen.getByLabelText('Name'), 'Cream 7%')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(updateIngredient).toHaveBeenCalledWith(
      'i1',
      expect.objectContaining({ name: 'Cream 7%', kcal_100: 92, category_id: 'c1' }),
    )
  })

  test('shows a friendly error when saving fails', async () => {
    vi.mocked(updateIngredient).mockRejectedValue(new TypeError('Load failed'))
    const user = userEvent.setup()
    const { onClose } = renderSheet(CREAM)

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No connection.')
    expect(onClose).not.toHaveBeenCalled()
  })

  test('deletes after confirmation', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    const { onClose } = renderSheet(CREAM)

    await user.click(screen.getByRole('button', { name: 'Delete Ingredient' }))

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Cream'))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(deleteIngredient).toHaveBeenCalledWith('i1')
  })

  test('keeps the ingredient when deleting is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    renderSheet(CREAM)

    await user.click(screen.getByRole('button', { name: 'Delete Ingredient' }))

    expect(deleteIngredient).not.toHaveBeenCalled()
  })

  test('new ingredients cannot be deleted', () => {
    renderSheet()

    expect(screen.queryByRole('button', { name: 'Delete Ingredient' })).not.toBeInTheDocument()
  })
})
