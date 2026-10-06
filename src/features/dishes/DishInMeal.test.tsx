import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { CurrentUserContext } from '../../app/currentUser'
import { renderWithProviders } from '../../test/render'
import { dayMeal, mealItem } from '../meals/testData'

vi.mock('../meals/mealsApi', () => ({
  fetchDay: vi.fn(),
  addMealItem: vi.fn(),
  updateMealItem: vi.fn(),
  deleteMealItem: vi.fn(),
}))
vi.mock('../ingredients/ingredientsApi', () => ({
  fetchIngredients: vi.fn().mockResolvedValue([]),
  fetchCategories: vi.fn().mockResolvedValue([]),
}))
vi.mock('../household/householdApi', () => ({ fetchMembers: vi.fn() }))
vi.mock('./dishesApi', () => ({
  fetchDish: vi.fn(),
  saveDish: vi.fn(),
  deleteDish: vi.fn(),
  fetchLeftoverDishes: vi.fn(),
}))

import { fetchMembers } from '../household/householdApi'
import { fetchDay } from '../meals/mealsApi'
import { MealSheet } from '../meals/MealSheet'
import { DELETE_SHARED_QUESTION } from './confirmDelete'
import { deleteDish, fetchDish, fetchLeftoverDishes, saveDish } from './dishesApi'
import type { Dish } from './portions'
import { gramsItem } from './testData'

const DATE = '2026-10-01'

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
// the nickname I gave her is what the dish shows, not her account name
const ME = {
  ...profile('u1', 'Lukas'),
  appearance: { partnerLooks: { u2: { nickname: 'Schatz' } } },
}
const HER = profile('u2', 'Lisa')

const CHILI: Dish = {
  id: 'dish-1',
  name: 'Chili',
  splitMode: 'equal',
  cookedWeightG: null,
  revision: 'rev-1',
  portions: [
    { id: 'p-me', eater: { userId: 'u1', date: DATE, mealType: 'lunch' }, splitValue: null },
    { id: 'p-her', eater: { userId: 'u2', date: DATE, mealType: 'lunch' }, splitValue: null },
  ],
  lines: [{ id: 'l-mince', allocation: 'shared', item: gramsItem('Mince', 400, 250), amounts: {} }],
}
const MY_CHILI = mealItem({
  id: 'srv-1',
  name: 'Mince',
  entered_amount: 200,
  basis_multiplier: 2,
  kcal: 250,
  dish_portion_id: 'p-me',
  dish_line_id: 'l-mince',
  dish: { id: 'dish-1', name: 'Chili', portionCount: 2, eaterCount: 2 },
})

const BANANA: Dish = {
  id: 'dish-2',
  name: null,
  splitMode: 'equal',
  cookedWeightG: null,
  revision: 'rev-b',
  portions: [
    { id: 'p-banana', eater: { userId: 'u1', date: DATE, mealType: 'lunch' }, splitValue: null },
  ],
  lines: [
    { id: 'l-banana', allocation: 'shared', item: gramsItem('Banana', 120, 90), amounts: {} },
  ],
}
const MY_BANANA = mealItem({
  id: 'srv-2',
  name: 'Banana',
  entered_amount: 120,
  basis_multiplier: 1.2,
  kcal: 90,
  dish_portion_id: 'p-banana',
  dish_line_id: 'l-banana',
  dish: { id: 'dish-2', name: null, portionCount: 1, eaterCount: 1 },
})

function renderSheet() {
  return within(renderSheetWithCache().getByRole('dialog', { name: 'Lunch' }))
}

function renderSheetWithCache() {
  const { queryClient } = renderWithProviders(
    <CurrentUserContext value={{ profile: ME, householdId: 'h1' }}>
      <MealSheet
        open
        mealType="lunch"
        userId="u1"
        date={DATE}
        onClose={() => {}}
        onCook={() => {}}
      />
    </CurrentUserContext>,
  )
  return { getByRole: screen.getByRole, queryClient }
}

function sentDish(): Dish {
  const call = vi.mocked(saveDish).mock.calls.at(-1)
  if (!call) throw new Error('saveDish was not called')
  return call[0].dish
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchDay).mockResolvedValue([
    dayMeal('m1', 'lunch', [mealItem({ id: 'apple', name: 'Apple' }), MY_CHILI, MY_BANANA]),
  ])
  vi.mocked(fetchMembers).mockResolvedValue([ME, HER])
  vi.mocked(fetchDish).mockImplementation(async (id) => (id === 'dish-1' ? CHILI : BANANA))
  vi.mocked(saveDish).mockResolvedValue()
  vi.mocked(deleteDish).mockResolvedValue()
  vi.mocked(fetchLeftoverDishes).mockResolvedValue([])
})

afterEach(() => vi.restoreAllMocks())

describe('a shared dish in the meal', () => {
  test('shows as one block with my share, which opens to show the ingredients', async () => {
    const user = userEvent.setup()
    const sheet = renderSheet()

    const block = await sheet.findByRole('button', {
      name: /Chili.*Shared · 1 ingredient.*500 kcal/,
    })
    expect(sheet.queryByText('Mince')).not.toBeInTheDocument()
    await user.click(block)

    expect(sheet.getByText('Mince')).toBeInTheDocument()
    expect(sheet.getByRole('button', { name: 'Edit dish' })).toBeInTheDocument()
  })

  test('editing it saves on top of the loaded version', async () => {
    const user = userEvent.setup()
    const sheet = renderSheet()

    await user.click(await sheet.findByRole('button', { name: /Chili/ }))
    await user.click(sheet.getByRole('button', { name: 'Edit dish' }))
    expect(await sheet.findByLabelText('Dish name (optional)')).toHaveValue('Chili')
    expect(sheet.getByRole('combobox', { name: 'Schatz' })).toHaveValue('lunch')
    await user.click(sheet.getByRole('button', { name: /Mince/ }))
    const amount = sheet.getByLabelText('Amount')
    await user.clear(amount)
    await user.type(amount, '600')
    await user.click(sheet.getByRole('button', { name: 'Save' }))
    await user.click(sheet.getByRole('button', { name: 'Save dish' }))

    expect(vi.mocked(saveDish).mock.calls[0]?.[0].baseRevision).toBe('rev-1')
    expect(sentDish().lines[0]?.item).toMatchObject({ entered_amount: 600, basis_multiplier: 6 })
  })

  test("a partner's newer version while editing: my draft stays, a notice offers it", async () => {
    // Arrange: I'm editing the chili
    const user = userEvent.setup()
    const { getByRole, queryClient } = renderSheetWithCache()
    const sheet = within(getByRole('dialog', { name: 'Lunch' }))
    await user.click(await sheet.findByRole('button', { name: /Chili/ }))
    await user.click(sheet.getByRole('button', { name: 'Edit dish' }))
    const name = await sheet.findByLabelText('Dish name (optional)')
    await user.clear(name)
    await user.type(name, 'My chili')

    // Act: she saves the same dish meanwhile (a live update reloads it)
    vi.mocked(fetchDish).mockResolvedValue({ ...CHILI, name: 'Her chili', revision: 'rev-2' })
    await queryClient.invalidateQueries({ queryKey: ['dish', 'dish-1'] })

    // Assert
    expect(await sheet.findByText('Updated on another phone')).toBeInTheDocument()
    expect(name).toHaveValue('My chili')
  })

  test("saving over a partner's newer version is held back, keeping my draft", async () => {
    // Arrange: I changed the name, then she saved the same dish
    const user = userEvent.setup()
    const { getByRole, queryClient } = renderSheetWithCache()
    const sheet = within(getByRole('dialog', { name: 'Lunch' }))
    await user.click(await sheet.findByRole('button', { name: /Chili/ }))
    await user.click(sheet.getByRole('button', { name: 'Edit dish' }))
    const name = await sheet.findByLabelText('Dish name (optional)')
    await user.clear(name)
    await user.type(name, 'My chili')
    vi.mocked(fetchDish).mockResolvedValue({ ...CHILI, name: 'Her chili', revision: 'rev-2' })
    await queryClient.invalidateQueries({ queryKey: ['dish', 'dish-1'] })
    await sheet.findByText('Updated on another phone')

    // Act
    await user.click(sheet.getByRole('button', { name: 'Save dish' }))

    // Assert: nothing is sent (it would overwrite hers, or be refused after the sheet closed)
    expect(await sheet.findByRole('alert')).toHaveTextContent(/updated on another phone/i)
    expect(saveDish).not.toHaveBeenCalled()
    expect(name).toHaveValue('My chili')
  })

  test("loading a partner's newer version replaces my draft with it", async () => {
    // Arrange
    const user = userEvent.setup()
    const { getByRole, queryClient } = renderSheetWithCache()
    const sheet = within(getByRole('dialog', { name: 'Lunch' }))
    await user.click(await sheet.findByRole('button', { name: /Chili/ }))
    await user.click(sheet.getByRole('button', { name: 'Edit dish' }))
    await sheet.findByLabelText('Dish name (optional)')
    vi.mocked(fetchDish).mockResolvedValue({ ...CHILI, name: 'Her chili', revision: 'rev-2' })
    await queryClient.invalidateQueries({ queryKey: ['dish', 'dish-1'] })

    // Act
    await user.click(await sheet.findByRole('button', { name: 'Load changes' }))

    // Assert
    expect(sheet.getByLabelText('Dish name (optional)')).toHaveValue('Her chili')
    expect(sheet.queryByText('Updated on another phone')).not.toBeInTheDocument()
    await user.click(sheet.getByRole('button', { name: 'Save dish' }))
    expect(vi.mocked(saveDish).mock.calls[0]?.[0].baseRevision).toBe('rev-2')
  })

  test('sharing afterwards: she can be added while editing', async () => {
    vi.mocked(fetchDish).mockResolvedValue({ ...CHILI, portions: [CHILI.portions[0]!] })
    const user = userEvent.setup()
    const sheet = renderSheet()

    await user.click(await sheet.findByRole('button', { name: /Chili/ }))
    await user.click(sheet.getByRole('button', { name: 'Edit dish' }))
    await user.selectOptions(await sheet.findByRole('combobox', { name: 'Schatz' }), 'dinner')
    await user.click(sheet.getByRole('button', { name: 'Save dish' }))

    expect(sentDish().portions.map((portion) => portion.eater)).toEqual([
      { userId: 'u1', date: DATE, mealType: 'lunch' },
      { userId: 'u2', date: DATE, mealType: 'dinner' },
    ])
  })

  test('an ingredient of the dish can be removed', async () => {
    const user = userEvent.setup()
    const sheet = renderSheet()

    await user.click(await sheet.findByRole('button', { name: /Chili/ }))
    await user.click(sheet.getByRole('button', { name: 'Edit dish' }))
    await user.click(await sheet.findByRole('button', { name: /Mince/ }))
    await user.click(sheet.getByRole('button', { name: 'Remove from dish' }))

    expect(sheet.queryByRole('button', { name: /Mince/ })).not.toBeInTheDocument()
  })

  test('deleting it asks first, since it is in other meals too', async () => {
    // Arrange
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    const user = userEvent.setup()
    const sheet = renderSheet()
    await user.click(await sheet.findByRole('button', { name: /Chili/ }))
    await user.click(sheet.getByRole('button', { name: 'Edit dish' }))

    // Act: declined, then confirmed
    await user.click(await sheet.findByRole('button', { name: 'Delete dish' }))
    expect(deleteDish).not.toHaveBeenCalled()
    await user.click(sheet.getByRole('button', { name: 'Delete dish' }))

    // Assert
    expect(confirm).toHaveBeenCalledWith(DELETE_SHARED_QUESTION)
    await waitFor(() => expect(deleteDish).toHaveBeenCalledWith('dish-1'))
  })

  test('swiping it away asks first too', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    const sheet = renderSheet()

    const block = (await sheet.findByRole('button', { name: /Chili/ })).closest(
      '[data-testid="swipeable-row"]',
    ) as HTMLElement
    await user.click(within(block).getByRole('button', { name: 'Delete' }))

    expect(window.confirm).toHaveBeenCalledWith(DELETE_SHARED_QUESTION)
    await waitFor(() => expect(deleteDish).toHaveBeenCalledWith('dish-1'))
  })
})

describe('a single food logged alone', () => {
  test('shows like a plain item, not as a dish', async () => {
    const sheet = renderSheet()

    const row = await sheet.findByRole('button', { name: /Banana.*120 g.*108 kcal/ })
    expect(row).not.toHaveTextContent('ingredient')
  })

  test('its amount is changed directly, through its dish', async () => {
    const user = userEvent.setup()
    const sheet = renderSheet()

    await user.click(await sheet.findByRole('button', { name: /Banana/ }))
    const amount = await sheet.findByLabelText('Amount')
    expect(amount).toHaveValue('120')
    await user.clear(amount)
    await user.type(amount, '60')
    await user.click(sheet.getByRole('button', { name: 'Save' }))

    expect(vi.mocked(saveDish).mock.calls[0]?.[0].baseRevision).toBe('rev-b')
    expect(sentDish().lines[0]?.item).toMatchObject({ entered_amount: 60, basis_multiplier: 0.6 })
  })

  test('can be opened as a dish, e.g. to share it afterwards', async () => {
    const user = userEvent.setup()
    const sheet = renderSheet()

    await user.click(await sheet.findByRole('button', { name: /Banana/ }))
    await user.click(await sheet.findByRole('button', { name: 'Edit dish' }))
    await user.selectOptions(await sheet.findByRole('combobox', { name: 'Schatz' }), 'lunch')
    await user.click(sheet.getByRole('button', { name: 'Save dish' }))

    expect(sentDish().portions.map((portion) => portion.eater?.userId)).toEqual(['u1', 'u2'])
  })

  test('is removed without asking', async () => {
    const confirm = vi.spyOn(window, 'confirm')
    const user = userEvent.setup()
    const sheet = renderSheet()

    await user.click(await sheet.findByRole('button', { name: /Banana/ }))
    await user.click(await sheet.findByRole('button', { name: 'Remove from Lunch' }))

    await waitFor(() => expect(deleteDish).toHaveBeenCalledWith('dish-2'))
    expect(confirm).not.toHaveBeenCalled()
  })
})
