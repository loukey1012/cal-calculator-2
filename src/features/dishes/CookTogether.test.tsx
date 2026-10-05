import { act, screen, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { onlineManager } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { CurrentUserContext } from '../../app/currentUser'
import { renderWithProviders } from '../../test/render'
import { ingredient } from '../ingredients/testData'
import { dayMeal, mealItem } from '../meals/testData'

vi.mock('../meals/mealsApi', () => ({
  fetchDay: vi.fn(),
  addMealItem: vi.fn(),
  updateMealItem: vi.fn(),
  deleteMealItem: vi.fn(),
}))
vi.mock('../ingredients/ingredientsApi', () => ({
  fetchIngredients: vi.fn(),
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
import { fetchIngredients } from '../ingredients/ingredientsApi'
import { fetchDay } from '../meals/mealsApi'
import { MealSheet } from '../meals/MealSheet'
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
const ME = profile('u1', 'Lukas')
const HER = profile('u2', 'Lisa')

const PATTY = ingredient({ id: 'patty', name: 'Patty', kcal_100: 240, protein_100: 20 })
const TOMATO = ingredient({ id: 'tomato', name: 'Tomato', kcal_100: 18 })
const NOODLES = ingredient({ id: 'noodles', name: 'Noodles', kcal_100: 360 })

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

function renderSheet() {
  renderWithProviders(
    <CurrentUserContext value={{ profile: ME, householdId: 'h1' }}>
      <MealSheet open mealType="lunch" userId="u1" date={DATE} onClose={() => {}} />
    </CurrentUserContext>,
  )
  return within(screen.getByRole('dialog', { name: 'Lunch' }))
}

type Sheet = ReturnType<typeof renderSheet>

async function addIngredient(user: UserEvent, sheet: Sheet, name: string) {
  await user.click(sheet.getByRole('button', { name: 'Add ingredient' }))
  await user.click(await sheet.findByRole('button', { name: new RegExp(name) }))
}

function sentDish(): Dish {
  const call = vi.mocked(saveDish).mock.calls.at(-1)
  if (!call) throw new Error('saveDish was not called')
  return call[0].dish
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchDay).mockResolvedValue([dayMeal('m1', 'lunch', [])])
  vi.mocked(fetchIngredients).mockResolvedValue([PATTY, TOMATO, NOODLES])
  vi.mocked(fetchMembers).mockResolvedValue([ME, HER])
  vi.mocked(fetchDish).mockResolvedValue(CHILI)
  vi.mocked(saveDish).mockResolvedValue()
  vi.mocked(deleteDish).mockResolvedValue()
  vi.mocked(fetchLeftoverDishes).mockResolvedValue([])
})

afterEach(() => {
  act(() => onlineManager.setOnline(true))
})

describe('cooking together', () => {
  test('a burger: shared patty, tomato only for her, saved for both', async () => {
    // Arrange
    const user = userEvent.setup()
    const sheet = renderSheet()

    // Act
    await user.click(await sheet.findByRole('button', { name: 'Cook together' }))
    expect(await sheet.findByRole('combobox', { name: 'Lisa' })).toHaveValue('lunch')
    await user.type(sheet.getByLabelText('Dish name (optional)'), 'Burger')
    await addIngredient(user, sheet, 'Patty')
    await user.type(sheet.getByLabelText('Amount'), '250')
    await user.click(sheet.getByRole('button', { name: 'Add to dish' }))
    await addIngredient(user, sheet, 'Tomato')
    await user.click(sheet.getByRole('radio', { name: 'Only Lisa' }))
    await user.type(sheet.getByLabelText('Amount'), '20')
    await user.click(sheet.getByRole('button', { name: 'Add to dish' }))

    // Assert: both totals before saving
    const totals = sheet.getByTestId('dish-totals')
    expect(within(totals).getByText('Lukas').closest('div')?.parentElement).toHaveTextContent(
      '300 kcal',
    )
    expect(sheet.getByRole('button', { name: /Tomato.*only Lisa/ })).toBeInTheDocument()

    // still being sent: the meal shows the dish right away
    vi.mocked(saveDish).mockReturnValueOnce(new Promise(() => {}))
    await user.click(sheet.getByRole('button', { name: 'Save dish' }))
    const dish = sentDish()
    expect(dish.name).toBe('Burger')
    expect(dish.portions.map((portion) => portion.eater)).toEqual([
      { userId: 'u1', date: DATE, mealType: 'lunch' },
      { userId: 'u2', date: DATE, mealType: 'lunch' },
    ])
    const herPortion = dish.portions[1]!.id
    expect(dish.lines).toEqual([
      expect.objectContaining({
        allocation: 'shared',
        item: expect.objectContaining({ ingredient_id: 'patty', entered_amount: 250 }),
      }),
      expect.objectContaining({ allocation: 'per_portion', amounts: { [herPortion]: 20 } }),
    ])
    // back in the meal: one block for the dish
    expect(await sheet.findByRole('button', { name: /Burger.*300 kcal/ })).toBeInTheDocument()
  })

  test('own amounts per person: 120 g and 100 g of noodles', async () => {
    const user = userEvent.setup()
    const sheet = renderSheet()

    await user.click(await sheet.findByRole('button', { name: 'Cook together' }))
    await addIngredient(user, sheet, 'Noodles')
    await user.click(await sheet.findByRole('radio', { name: 'Own amounts' }))
    await user.type(sheet.getByLabelText('Lukas amount'), '120')
    await user.type(sheet.getByLabelText('Lisa amount'), '100')
    await user.click(sheet.getByRole('button', { name: 'Add to dish' }))
    await user.click(sheet.getByRole('button', { name: 'Save dish' }))

    const dish = sentDish()
    const [mine, hers] = dish.portions.map((portion) => portion.id)
    expect(dish.lines[0]).toMatchObject({
      allocation: 'per_portion',
      amounts: { [mine!]: 120, [hers!]: 100 },
    })
  })

  test('count split: I have 3, she has 2', async () => {
    const user = userEvent.setup()
    const sheet = renderSheet()

    await user.click(await sheet.findByRole('button', { name: 'Cook together' }))
    await addIngredient(user, sheet, 'Patty')
    await user.type(sheet.getByLabelText('Amount'), '500')
    await user.click(sheet.getByRole('button', { name: 'Add to dish' }))
    await user.click(sheet.getByRole('radio', { name: 'Count' }))
    await user.clear(sheet.getByLabelText('Lukas count'))
    await user.type(sheet.getByLabelText('Lukas count'), '3')
    await user.clear(sheet.getByLabelText('Lisa count'))
    await user.type(sheet.getByLabelText('Lisa count'), '2')

    // 1200 kcal in the pot: 720 for me, 480 for her
    expect(sheet.getByTestId('dish-totals')).toHaveTextContent(/Lukas.*720 kcal/)
    expect(sheet.getByTestId('dish-totals')).toHaveTextContent(/Lisa.*480 kcal/)
    await user.click(sheet.getByRole('button', { name: 'Save dish' }))
    expect(sentDish()).toMatchObject({ splitMode: 'count' })
    expect(sentDish().portions.map((portion) => portion.splitValue)).toEqual([3, 2])
  })

  test('someone not eating along gets no portion', async () => {
    const user = userEvent.setup()
    const sheet = renderSheet()

    await user.click(await sheet.findByRole('button', { name: 'Cook together' }))
    await user.selectOptions(await sheet.findByRole('combobox', { name: 'Lisa' }), 'none')
    await addIngredient(user, sheet, 'Patty')
    await user.type(sheet.getByLabelText('Amount'), '100')
    await user.click(sheet.getByRole('button', { name: 'Add to dish' }))
    await user.click(sheet.getByRole('button', { name: 'Save dish' }))

    expect(sentDish().portions.map((portion) => portion.eater?.userId)).toEqual(['u1'])
  })

  test('an impossible split says why and is not saved', async () => {
    const user = userEvent.setup()
    const sheet = renderSheet()

    await user.click(await sheet.findByRole('button', { name: 'Cook together' }))
    await addIngredient(user, sheet, 'Patty')
    await user.type(sheet.getByLabelText('Amount'), '100')
    await user.click(sheet.getByRole('button', { name: 'Add to dish' }))
    await user.click(sheet.getByRole('radio', { name: '%' }))
    await user.clear(sheet.getByLabelText('Lukas percent'))
    await user.type(sheet.getByLabelText('Lukas percent'), '60')
    await user.click(sheet.getByRole('button', { name: 'Save dish' }))

    expect(sheet.getAllByText('The percentages add up to more than 100 %').length).toBeGreaterThan(
      0,
    )
    expect(saveDish).not.toHaveBeenCalled()
  })

  test('a dish needs at least one ingredient', async () => {
    const user = userEvent.setup()
    const sheet = renderSheet()

    await user.click(await sheet.findByRole('button', { name: 'Cook together' }))
    await sheet.findByRole('combobox', { name: 'Lisa' })
    await user.click(sheet.getByRole('button', { name: 'Save dish' }))

    expect(sheet.getByText('Add at least one ingredient')).toBeInTheDocument()
    expect(saveDish).not.toHaveBeenCalled()
  })
})

describe('sharing a meal logged alone', () => {
  const APPLE = mealItem({ id: 'apple', name: 'Apple', entered_amount: 150, basis_multiplier: 1.5 })
  const OATS = mealItem({ id: 'oats', name: 'Oats', entered_amount: 80, basis_multiplier: 0.8 })

  test('turns its items into a dish for both and takes them out of the meal', async () => {
    vi.mocked(fetchDay).mockResolvedValue([dayMeal('m1', 'lunch', [APPLE, OATS])])
    const user = userEvent.setup()
    const sheet = renderSheet()

    await user.click(await sheet.findByRole('button', { name: 'Share this meal' }))
    expect(await sheet.findByRole('button', { name: /Apple.*150 g · shared/ })).toBeInTheDocument()
    expect(sheet.getByRole('combobox', { name: 'Lisa' })).toHaveValue('lunch')
    await user.click(sheet.getByRole('button', { name: 'Save dish' }))

    const request = vi.mocked(saveDish).mock.calls[0]?.[0]
    expect(request?.replaceItemIds).toEqual(['apple', 'oats'])
    expect(request?.dish.lines.map((line) => [line.item.name, line.item.entered_amount])).toEqual([
      ['Apple', 150],
      ['Oats', 80],
    ])
    expect(request?.dish.portions).toHaveLength(2)
  })

  test('is only offered when the meal has food of its own', async () => {
    const sheet = renderSheet()

    await sheet.findByRole('button', { name: 'Cook together' })
    expect(sheet.queryByRole('button', { name: 'Share this meal' })).not.toBeInTheDocument()
  })
})

describe('a cooked dish in the meal', () => {
  const MY_CHILI = mealItem({
    id: 'srv-1',
    name: 'Mince',
    entered_amount: 200,
    basis_multiplier: 2,
    kcal: 250,
    dish_portion_id: 'p-me',
    dish_line_id: 'l-mince',
    dish: { id: 'dish-1', name: 'Chili' },
  })

  beforeEach(() => {
    vi.mocked(fetchDay).mockResolvedValue([
      dayMeal('m1', 'lunch', [mealItem({ id: 'apple', name: 'Apple' }), MY_CHILI]),
    ])
  })

  test('shows as one block with my share, which opens to show the ingredients', async () => {
    const user = userEvent.setup()
    const sheet = renderSheet()

    const block = await sheet.findByRole('button', { name: /Chili.*500 kcal/ })
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
    await user.click(sheet.getByRole('button', { name: /Mince/ }))
    const amount = sheet.getByLabelText('Amount')
    await user.clear(amount)
    await user.type(amount, '600')
    await user.click(sheet.getByRole('button', { name: 'Save' }))
    await user.click(sheet.getByRole('button', { name: 'Save dish' }))

    expect(vi.mocked(saveDish).mock.calls[0]?.[0].baseRevision).toBe('rev-1')
    expect(sentDish().lines[0]?.item).toMatchObject({ entered_amount: 600, basis_multiplier: 6 })
  })

  test('the whole dish can be deleted', async () => {
    const user = userEvent.setup()
    const sheet = renderSheet()

    await user.click(await sheet.findByRole('button', { name: /Chili/ }))
    await user.click(sheet.getByRole('button', { name: 'Edit dish' }))
    await user.click(await sheet.findByRole('button', { name: 'Delete dish' }))

    expect(deleteDish).toHaveBeenCalledWith('dish-1')
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
})

describe('leftovers', () => {
  const WITH_LEFTOVER: Dish = {
    ...CHILI,
    portions: [...CHILI.portions, { id: 'p-rest', eater: null, splitValue: null }],
  }

  test('cooking one portion more keeps it as a leftover', async () => {
    const user = userEvent.setup()
    const sheet = renderSheet()

    await user.click(await sheet.findByRole('button', { name: 'Cook together' }))
    await user.click(await sheet.findByRole('button', { name: 'More leftover portions' }))
    await addIngredient(user, sheet, 'Patty')
    await user.type(sheet.getByLabelText('Amount'), '300')
    await user.click(sheet.getByRole('button', { name: 'Add to dish' }))

    // 720 kcal in the pot: a third each
    expect(sheet.getByTestId('dish-totals')).toHaveTextContent(/Leftover.*240 kcal/)
    await user.click(sheet.getByRole('button', { name: 'Save dish' }))
    expect(sentDish().portions.map((portion) => portion.eater?.userId ?? null)).toEqual([
      'u1',
      'u2',
      null,
    ])
  })

  test('a leftover is offered first when adding food, and logged into this meal', async () => {
    vi.mocked(fetchLeftoverDishes).mockResolvedValue([WITH_LEFTOVER])
    const user = userEvent.setup()
    const sheet = renderSheet()

    await user.click(await sheet.findByRole('button', { name: 'Add food' }))
    // a third of 400 g mince at 250 kcal
    await user.click(await sheet.findByRole('button', { name: /Chili.*334 kcal/ }))

    const dish = sentDish()
    expect(dish.portions.find((portion) => portion.id === 'p-rest')?.eater).toEqual({
      userId: 'u1',
      date: DATE,
      mealType: 'lunch',
    })
    expect(vi.mocked(saveDish).mock.calls[0]?.[0].baseRevision).toBe('rev-1')
  })
})
