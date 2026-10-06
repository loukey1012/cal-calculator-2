import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { onlineManager } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { CurrentUserContext } from '../../app/currentUser'
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

type SheetQueries = ReturnType<typeof renderSheet>['sheet']

async function changeCreamTo(user: UserEvent, sheet: SheetQueries, grams: string) {
  await user.click(await sheet.findByRole('button', { name: /Cream/ }))
  const amount = sheet.getByLabelText('Amount')
  await user.clear(amount)
  await user.type(amount, grams)
  await user.click(sheet.getByRole('button', { name: 'Save' }))
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

  test('a saved change also refreshes the month calendar', async () => {
    const user = userEvent.setup()
    const { sheet, queryClient } = renderSheet()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    await user.click(await sheet.findByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['month', 'u1'] }))
  })

  test('offers no way to add food: that happens on Cook', async () => {
    vi.mocked(fetchDay).mockResolvedValue([dayMeal('m1', 'lunch', [])])
    const { sheet } = renderSheet()

    expect(await sheet.findByText('Nothing logged yet.')).toBeInTheDocument()
    expect(sheet.getByText('Meals are added on the Cook tab.')).toBeInTheDocument()
    expect(
      sheet.queryByRole('button', { name: /Add food|Cook together|Share/ }),
    ).not.toBeInTheDocument()
  })

  test('a failed change is undone and explained', async () => {
    // a server error; dropped connections are retried instead (see the retry test)
    vi.mocked(updateMealItem).mockRejectedValue(
      new ApiError('new row for relation "meal_items" violates check constraint', '23514'),
    )
    const user = userEvent.setup()
    const { sheet } = renderSheet()

    await changeCreamTo(user, sheet, '200')

    expect(await sheet.findByRole('alert')).toHaveTextContent('Some values aren’t allowed.')
    expect(await sheet.findByRole('button', { name: /Cream.*150 g/ })).toBeInTheDocument()
  })

  test('changes to a day reach the server in order: a delete waits for the change before it', async () => {
    let finishUpdate = () => {}
    vi.mocked(updateMealItem).mockReturnValue(
      new Promise<void>((resolve) => (finishUpdate = resolve)),
    )
    const user = userEvent.setup()
    const { sheet } = renderSheet()

    await changeCreamTo(user, sheet, '200')
    await user.click(await sheet.findByRole('button', { name: 'Delete' }))

    expect(deleteMealItem).not.toHaveBeenCalled()
    finishUpdate()
    await waitFor(() => expect(deleteMealItem).toHaveBeenCalledTimes(1))
  })

  test('an old error disappears once a later change succeeds', async () => {
    vi.mocked(updateMealItem).mockRejectedValueOnce(
      new ApiError('new row for relation "meal_items" violates check constraint', '23514'),
    )
    const user = userEvent.setup()
    const { sheet } = renderSheet()

    await changeCreamTo(user, sheet, '200')
    expect(await sheet.findByRole('alert')).toBeInTheDocument()

    await user.click(sheet.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(sheet.queryByRole('alert')).not.toBeInTheDocument())
  })

  test('offline, a changed amount shows right away and is sent once back online', async () => {
    const user = userEvent.setup()
    const { sheet } = renderSheet()
    await user.click(await sheet.findByRole('button', { name: /Cream/ }))
    const amount = sheet.getByLabelText('Amount')
    await user.clear(amount)
    await user.type(amount, '200')
    // signal drops right before saving
    act(() => onlineManager.setOnline(false))
    await user.click(sheet.getByRole('button', { name: 'Save' }))

    expect(await sheet.findByRole('button', { name: /Cream.*200 g/ })).toBeInTheDocument()
    expect(updateMealItem).not.toHaveBeenCalled()
    act(() => onlineManager.setOnline(true))
    await waitFor(() => expect(updateMealItem).toHaveBeenCalledTimes(1))
  })

  test('a dropped connection is retried', async () => {
    vi.mocked(updateMealItem)
      .mockRejectedValueOnce(new TypeError('Load failed'))
      .mockResolvedValueOnce()
    const user = userEvent.setup()
    const { sheet } = renderSheet()

    await changeCreamTo(user, sheet, '200')

    await waitFor(() => expect(updateMealItem).toHaveBeenCalledTimes(2), { timeout: 4000 })
    expect(sheet.queryByRole('alert')).not.toBeInTheDocument()
  })

  test('Back returns from editing to the meal', async () => {
    const user = userEvent.setup()
    const { sheet } = renderSheet()

    await user.click(await sheet.findByRole('button', { name: /Cream/ }))
    await user.click(sheet.getByRole('button', { name: 'Back' }))

    expect(sheet.getByTestId('meal-total')).toBeInTheDocument()
  })
})
