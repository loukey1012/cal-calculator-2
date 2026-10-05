import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { onlineManager } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { CurrentUserContext } from '../../app/currentUser'
import { STALE_TIME_MS } from '../../lib/queryClient'
import { ApiError } from '../../lib/errors'
import { renderWithProviders } from '../../test/render'
import { ingredient } from '../ingredients/testData'
import { dayMeal, mealItem } from './testData'

vi.mock('../dishes/dishesApi', () => ({
  fetchLeftoverDishes: vi.fn().mockResolvedValue([]),
  fetchDish: vi.fn(),
  saveDish: vi.fn(),
  deleteDish: vi.fn(),
}))
vi.mock('./mealsApi', () => ({
  fetchDay: vi.fn(),
  addMealItem: vi.fn(),
  updateMealItem: vi.fn(),
  deleteMealItem: vi.fn(),
}))
vi.mock('../ingredients/ingredientsApi', () => ({
  fetchIngredients: vi.fn(),
  fetchCategories: vi.fn().mockResolvedValue([]),
}))

import { fetchIngredients } from '../ingredients/ingredientsApi'
import { addMealItem, deleteMealItem, fetchDay, updateMealItem } from './mealsApi'
import { MealSheet } from './MealSheet'

const PROFILE = {
  id: 'u1',
  household_id: 'h1',
  display_name: 'Lukas',
  accent_color: '#007aff',
  appearance: {},
  created_at: '',
  updated_at: '',
}
const CREAM_ITEM = mealItem({
  id: 'cream-item',
  name: 'Cream',
  entered_amount: 150,
  basis_multiplier: 1.5,
  kcal: 92,
  protein: 1.3,
})
const CREAM = ingredient({ id: 'cream', name: 'Cream', kcal_100: 92, protein_100: 1.3 })
const BAR = ingredient({
  id: 'bar',
  name: 'Protein bar',
  kcal_unit: 210,
  protein_unit: 20,
  unit_label: 'Riegel',
  unit_weight_g: 60,
})

function renderSheet(staleTime = 0) {
  const onClose = vi.fn()
  const { queryClient } = renderWithProviders(
    <CurrentUserContext value={{ profile: PROFILE, householdId: 'h1' }}>
      <MealSheet open mealType="lunch" userId="u1" date="2026-10-01" onClose={onClose} />
    </CurrentUserContext>,
    { staleTime },
  )
  return { onClose, queryClient, sheet: within(screen.getByRole('dialog', { name: 'Lunch' })) }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchDay).mockResolvedValue([dayMeal('m1', 'lunch', [CREAM_ITEM])])
  vi.mocked(fetchIngredients).mockResolvedValue([CREAM, BAR])
  vi.mocked(addMealItem).mockResolvedValue()
  vi.mocked(updateMealItem).mockResolvedValue()
  vi.mocked(deleteMealItem).mockResolvedValue()
})

afterEach(() => {
  act(() => onlineManager.setOnline(true))
})

describe('MealSheet', () => {
  test('lists the meal’s items with amount and calories, and the meal total', async () => {
    const { sheet } = renderSheet()

    const row = await sheet.findByRole('button', { name: /Cream/ })
    expect(row).toHaveTextContent('150 g')
    expect(row).toHaveTextContent('138 kcal')
    expect(sheet.getByTestId('meal-total')).toHaveTextContent('138 kcal')
  })

  test('adds an ingredient from the database in grams, with a live preview', async () => {
    const user = userEvent.setup()
    const { sheet } = renderSheet()
    await sheet.findByRole('button', { name: /Cream/ })

    await user.click(sheet.getByRole('button', { name: 'Add food' }))
    await user.click(await sheet.findByRole('button', { name: /Cream/ }))
    await user.type(sheet.getByLabelText('Amount'), '200')
    expect(sheet.getByTestId('amount-preview')).toHaveTextContent('184 kcal')
    // what the server returns when the app re-fetches after saving
    vi.mocked(fetchDay).mockResolvedValue([
      dayMeal('m1', 'lunch', [
        CREAM_ITEM,
        mealItem({ id: 'new', name: 'Cream', entered_amount: 200 }),
      ]),
    ])
    await user.click(sheet.getByRole('button', { name: 'Add to Lunch' }))

    expect(addMealItem).toHaveBeenCalledWith({
      id: expect.any(String),
      userId: 'u1',
      date: '2026-10-01',
      mealType: 'lunch',
      draft: expect.objectContaining({
        ingredient_id: 'cream',
        entered_amount: 200,
        entered_unit: 'g',
        basis_multiplier: 2,
        kcal: 92,
      }),
    })
    // back on the list, the new item shows right away
    expect(await sheet.findAllByRole('button', { name: /Cream/ })).toHaveLength(2)
  })

  test('logs an ingredient in its own unit', async () => {
    const user = userEvent.setup()
    const { sheet } = renderSheet()

    await user.click(await sheet.findByRole('button', { name: 'Add food' }))
    await user.type(sheet.getByRole('searchbox', { name: 'Search ingredients' }), 'protein')
    await user.click(await sheet.findByRole('button', { name: /Protein bar/ }))
    await user.click(sheet.getByRole('radio', { name: 'Riegel' }))
    await user.type(sheet.getByLabelText('Amount'), '2')
    await user.click(sheet.getByRole('button', { name: 'Add to Lunch' }))

    expect(addMealItem).toHaveBeenCalledWith(
      expect.objectContaining({
        draft: expect.objectContaining({
          entered_unit: 'unit',
          basis: 'per_unit',
          basis_multiplier: 2,
        }),
      }),
    )
  })

  test('adds a custom one-off item without touching the ingredient database', async () => {
    const user = userEvent.setup()
    const { sheet } = renderSheet()

    await user.click(await sheet.findByRole('button', { name: 'Add food' }))
    await user.click(sheet.getByRole('button', { name: /Custom item/ }))
    await user.type(sheet.getByLabelText('Name'), 'Bakery croissant')
    await user.click(sheet.getByRole('radio', { name: 'Per unit' }))
    await user.type(sheet.getByLabelText('Calories'), '231,2')
    await user.type(sheet.getByLabelText('Amount'), '1')
    await user.click(sheet.getByRole('button', { name: 'Add to Lunch' }))

    expect(addMealItem).toHaveBeenCalledWith(
      expect.objectContaining({
        draft: expect.objectContaining({
          ingredient_id: null,
          name: 'Bakery croissant',
          kcal: 232,
          entered_unit: 'unit',
        }),
      }),
    )
  })

  test('validates the amount before adding', async () => {
    const user = userEvent.setup()
    const { sheet } = renderSheet()

    await user.click(await sheet.findByRole('button', { name: 'Add food' }))
    await user.click(await sheet.findByRole('button', { name: /Cream/ }))
    await user.click(sheet.getByRole('button', { name: 'Add to Lunch' }))

    expect(sheet.getByText('Enter an amount')).toBeInTheDocument()
    expect(addMealItem).not.toHaveBeenCalled()
  })

  test('changes the amount of a logged item', async () => {
    const user = userEvent.setup()
    const { sheet } = renderSheet()

    await user.click(await sheet.findByRole('button', { name: /Cream/ }))
    const amount = sheet.getByLabelText('Amount')
    expect(amount).toHaveValue('150')
    await user.clear(amount)
    await user.type(amount, '200')
    await user.click(sheet.getByRole('button', { name: 'Save' }))

    expect(updateMealItem).toHaveBeenCalledWith('cream-item', {
      entered_amount: 200,
      basis_multiplier: 2,
    })
  })

  test('removes an item from the edit view', async () => {
    const user = userEvent.setup()
    const { sheet } = renderSheet()

    await user.click(await sheet.findByRole('button', { name: /Cream/ }))
    vi.mocked(fetchDay).mockResolvedValue([dayMeal('m1', 'lunch', [])])
    await user.click(sheet.getByRole('button', { name: 'Remove from Lunch' }))

    expect(deleteMealItem).toHaveBeenCalledWith('cream-item')
    await waitFor(() =>
      expect(sheet.queryByRole('button', { name: /Cream/ })).not.toBeInTheDocument(),
    )
  })

  test('removes an item with the swipe action', async () => {
    const user = userEvent.setup()
    const { sheet } = renderSheet()
    await sheet.findByRole('button', { name: /Cream/ })

    await user.click(sheet.getByRole('button', { name: 'Delete' }))

    expect(deleteMealItem).toHaveBeenCalledWith('cream-item')
  })

  test('a failed add is undone and explained', async () => {
    // a server error; dropped connections are retried instead (see the retry test)
    vi.mocked(addMealItem).mockRejectedValue(
      new ApiError('new row for relation "meal_items" violates check constraint', '23514'),
    )
    const user = userEvent.setup()
    const { sheet } = renderSheet()

    await user.click(await sheet.findByRole('button', { name: 'Add food' }))
    await user.click(await sheet.findByRole('button', { name: /Cream/ }))
    await user.type(sheet.getByLabelText('Amount'), '50')
    await user.click(sheet.getByRole('button', { name: 'Add to Lunch' }))

    expect(await sheet.findByRole('alert')).toHaveTextContent('Some values aren’t allowed.')
    expect(sheet.getAllByRole('button', { name: /Cream/ })).toHaveLength(1)
  })

  test('the picker refreshes ingredients, so ones added meanwhile (e.g. by a partner) show up', async () => {
    const user = userEvent.setup()
    const { sheet } = renderSheet(STALE_TIME_MS)
    await user.click(await sheet.findByRole('button', { name: 'Add food' }))
    await sheet.findByRole('button', { name: /Protein bar/ })
    await user.click(sheet.getByRole('button', { name: 'Back' }))
    vi.mocked(fetchIngredients).mockResolvedValue([
      CREAM,
      BAR,
      ingredient({ id: 'new', name: 'Skyr', kcal_100: 63 }),
    ])

    await user.click(sheet.getByRole('button', { name: 'Add food' }))

    expect(await sheet.findByRole('button', { name: /Skyr/ })).toBeInTheDocument()
  })

  test('changes to a day reach the server in order: a delete waits for the add it depends on', async () => {
    let finishAdd = () => {}
    vi.mocked(addMealItem).mockReturnValue(new Promise<void>((resolve) => (finishAdd = resolve)))
    const user = userEvent.setup()
    const { sheet } = renderSheet()

    await user.click(await sheet.findByRole('button', { name: 'Add food' }))
    await user.click(await sheet.findByRole('button', { name: /Protein bar/ }))
    await user.type(sheet.getByLabelText('Amount'), '1')
    await user.click(sheet.getByRole('button', { name: 'Add to Lunch' }))
    // the new item shows instantly; delete it before the server has stored it
    const newRow = (await sheet.findAllByTestId('swipeable-row')).at(-1) as HTMLElement
    await user.click(within(newRow).getByRole('button', { name: 'Delete' }))

    expect(deleteMealItem).not.toHaveBeenCalled()
    finishAdd()
    await waitFor(() => expect(deleteMealItem).toHaveBeenCalledTimes(1))
  })

  test('an old error disappears once a later change succeeds', async () => {
    vi.mocked(addMealItem).mockRejectedValueOnce(
      new ApiError('new row for relation "meal_items" violates check constraint', '23514'),
    )
    const user = userEvent.setup()
    const { sheet } = renderSheet()

    await user.click(await sheet.findByRole('button', { name: 'Add food' }))
    await user.click(await sheet.findByRole('button', { name: /Cream/ }))
    await user.type(sheet.getByLabelText('Amount'), '50')
    await user.click(sheet.getByRole('button', { name: 'Add to Lunch' }))
    expect(await sheet.findByRole('alert')).toBeInTheDocument()

    await user.click(sheet.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(sheet.queryByRole('alert')).not.toBeInTheDocument())
  })

  test('the edit view returns to the list if the item was removed meanwhile (e.g. by a partner)', async () => {
    const user = userEvent.setup()
    const { sheet, queryClient } = renderSheet()
    await user.click(await sheet.findByRole('button', { name: /Cream/ }))
    expect(sheet.getByLabelText('Amount')).toBeInTheDocument()

    act(() => queryClient.setQueryData(['day', 'u1', '2026-10-01'], [dayMeal('m1', 'lunch', [])]))

    // query updates reach components asynchronously
    await waitFor(() => expect(sheet.queryByLabelText('Amount')).not.toBeInTheDocument())
    expect(sheet.getByText('Nothing logged yet.')).toBeInTheDocument()
  })

  test('offline, an added item shows right away and is sent once back online', async () => {
    const user = userEvent.setup()
    const { sheet } = renderSheet()

    await user.click(await sheet.findByRole('button', { name: 'Add food' }))
    await user.click(await sheet.findByRole('button', { name: /Protein bar/ }))
    await user.type(sheet.getByLabelText('Amount'), '1')
    // signal drops right before adding
    act(() => onlineManager.setOnline(false))
    await user.click(sheet.getByRole('button', { name: 'Add to Lunch' }))

    expect(await sheet.findByRole('button', { name: /Protein bar/ })).toBeInTheDocument()
    expect(addMealItem).not.toHaveBeenCalled()
    act(() => onlineManager.setOnline(true))
    await waitFor(() => expect(addMealItem).toHaveBeenCalledTimes(1))
  })

  test('a dropped connection is retried with the same item id', async () => {
    vi.mocked(addMealItem)
      .mockRejectedValueOnce(new TypeError('Load failed'))
      .mockResolvedValueOnce()
    const user = userEvent.setup()
    const { sheet } = renderSheet()

    await user.click(await sheet.findByRole('button', { name: 'Add food' }))
    await user.click(await sheet.findByRole('button', { name: /Protein bar/ }))
    await user.type(sheet.getByLabelText('Amount'), '1')
    await user.click(sheet.getByRole('button', { name: 'Add to Lunch' }))

    await waitFor(() => expect(addMealItem).toHaveBeenCalledTimes(2), { timeout: 4000 })
    const [first, second] = vi.mocked(addMealItem).mock.calls
    expect(second?.[0].id).toBe(first?.[0].id)
    expect(sheet.queryByRole('alert')).not.toBeInTheDocument()
  })

  test('a saved change also refreshes the month calendar', async () => {
    const user = userEvent.setup()
    const { sheet, queryClient } = renderSheet()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    await user.click(await sheet.findByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['month', 'u1'] }))
  })

  test('Back returns from the picker to the meal', async () => {
    const user = userEvent.setup()
    const { sheet } = renderSheet()

    await user.click(await sheet.findByRole('button', { name: 'Add food' }))
    await user.click(sheet.getByRole('button', { name: 'Back' }))

    expect(sheet.getByRole('button', { name: 'Add food' })).toBeInTheDocument()
  })
})
