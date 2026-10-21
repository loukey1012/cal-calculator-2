import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { CurrentUserContext } from '../../app/currentUser'
import { toLocalDateString } from '../../lib/dates'
import { renderWithProviders } from '../../test/render'
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
  fetchIngredients: vi.fn().mockResolvedValue([]),
  fetchCategories: vi.fn().mockResolvedValue([]),
}))
vi.mock('../household/householdApi', () => ({ fetchMembers: vi.fn() }))
vi.mock('../recipes/recipesApi', () => ({
  fetchRecipes: vi.fn().mockResolvedValue([]),
  saveRecipe: vi.fn(),
  deleteRecipe: vi.fn(),
}))

import { fetchDish, saveDish } from '../dishes/dishesApi'
import type { Dish } from '../dishes/portions'
import { gramsItem } from '../dishes/testData'
import { fetchMembers } from '../household/householdApi'
import { saveRecipe } from '../recipes/recipesApi'
import { pickedChoice, type Recipe } from '../recipes/recipeModel'
import { fetchDay } from './mealsApi'
import { MealContent } from './MealContent'

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
const DAY = '2026-10-01'

const TOAST = mealItem({ id: 'toast', name: 'Toast', entered_amount: 60, kcal: 250 })
const JAM = mealItem({ id: 'jam', name: 'Jam', entered_amount: 20, kcal: 240 })

const CHILI: Dish = {
  id: 'd-chili',
  name: 'Chili',
  splitMode: 'equal',
  cookedWeightG: null,
  revision: 'rev-1',
  portions: [
    { id: 'p-me', eater: { userId: 'u1', date: DAY, mealType: 'lunch' }, splitValue: null },
    { id: 'p-her', eater: { userId: 'u2', date: DAY, mealType: 'lunch' }, splitValue: null },
  ],
  lines: [{ id: 'l-mince', allocation: 'shared', item: gramsItem('Mince', 400, 250), amounts: {} }],
}
const CHILI_ITEM = mealItem({
  id: 'chili-mince',
  name: 'Mince',
  entered_amount: 200,
  dish_portion_id: 'p-me',
  dish_line_id: 'l-mince',
  dish: { id: 'd-chili', name: 'Chili', portionCount: 2, eaterCount: 2 },
})

function renderSheet() {
  renderWithProviders(
    <CurrentUserContext value={{ profile: ME, householdId: 'h1' }}>
      <section aria-label="Lunch">
        <MealContent mealType="lunch" userId="u1" date={DAY} />
      </section>
    </CurrentUserContext>,
  )
  return within(screen.getByRole('region', { name: 'Lunch' }))
}

function sentDishes(): Dish[] {
  return vi.mocked(saveDish).mock.calls.map(([input]) => input.dish)
}

function savedRecipe(): Recipe {
  const call = vi.mocked(saveRecipe).mock.calls.at(-1)
  if (!call) throw new Error('saveRecipe was not called')
  return call[0]
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchDay).mockResolvedValue([dayMeal('m1', 'lunch', [TOAST, JAM])])
  vi.mocked(fetchMembers).mockResolvedValue([ME, HER])
  vi.mocked(saveDish).mockResolvedValue()
  vi.mocked(saveRecipe).mockResolvedValue()
  vi.mocked(fetchDish).mockResolvedValue(CHILI)
})

describe('copying a meal', () => {
  test('copies every food as logged to today’s chosen meal', async () => {
    // Arrange
    const user = userEvent.setup()
    const sheet = renderSheet()

    // Act
    await user.click(await sheet.findByRole('button', { name: 'Copy to…' }))
    await user.click(sheet.getByRole('radio', { name: 'Dinner' }))
    await user.click(sheet.getByRole('button', { name: 'Copy meal' }))

    // Assert
    const dishes = sentDishes()
    expect(dishes.map((dish) => dish.lines[0]?.item)).toEqual([
      expect.objectContaining({ name: 'Toast', entered_amount: 60, kcal: 250 }),
      expect.objectContaining({ name: 'Jam', entered_amount: 20, kcal: 240 }),
    ])
    for (const dish of dishes) {
      expect(dish.portions.map((portion) => portion.eater)).toEqual([
        { userId: 'u1', date: toLocalDateString(new Date()), mealType: 'dinner' },
      ])
    }
    expect(await sheet.findByRole('status')).toHaveTextContent(/^Copied to Dinner, /)
  })

  test('copies to the partner with the same amounts', async () => {
    const user = userEvent.setup()
    const sheet = renderSheet()

    await user.click(await sheet.findByRole('button', { name: 'Copy to…' }))
    // the partner's default nickname
    await user.click(await sheet.findByRole('radio', { name: /baby/ }))
    await user.click(sheet.getByRole('button', { name: 'Copy meal' }))

    expect(sentDishes()[0]?.portions[0]?.eater?.userId).toBe('u2')
    expect(sentDishes()[0]?.lines[0]?.item.entered_amount).toBe(60)
    expect(await sheet.findByRole('status')).toHaveTextContent(/for baby$/)
  })
})

describe('saving a meal as a recipe', () => {
  test('a meal of several foods is merged into one dish of what I ate', async () => {
    // Arrange
    const user = userEvent.setup()
    const sheet = renderSheet()

    // Act
    await user.click(await sheet.findByRole('button', { name: 'Save as recipe' }))
    await user.type(sheet.getByLabelText('Recipe name'), 'Jam toast')
    await user.click(sheet.getByRole('button', { name: 'Save recipe' }))

    // Assert
    const recipe = savedRecipe()
    expect(recipe.name).toBe('Jam toast')
    expect(recipe.portions).toEqual([{ id: expect.any(String), userId: 'u1', splitValue: null }])
    expect(recipe.slots.map(pickedChoice).map((line) => [line.allocation, line.item.name])).toEqual(
      [
        ['shared', 'Toast'],
        ['shared', 'Jam'],
      ],
    )
    expect(await sheet.findByRole('status')).toHaveTextContent('Saved as a recipe')
  })

  test('a meal of one dish keeps the whole dish, with everyone who ate it', async () => {
    // Arrange
    vi.mocked(fetchDay).mockResolvedValue([dayMeal('m1', 'lunch', [CHILI_ITEM])])
    const user = userEvent.setup()
    const sheet = renderSheet()

    // Act
    await user.click(await sheet.findByRole('button', { name: 'Save as recipe' }))
    expect(await sheet.findByDisplayValue('Chili')).toBeInTheDocument()
    await user.click(sheet.getByRole('button', { name: 'Save recipe' }))

    // Assert
    const recipe = savedRecipe()
    expect(recipe.portions.map((portion) => portion.userId)).toEqual(['u1', 'u2'])
    expect(recipe.slots.map((s) => pickedChoice(s).item)).toEqual(CHILI.lines.map((l) => l.item))
  })

  test('a recipe needs a name', async () => {
    const user = userEvent.setup()
    const sheet = renderSheet()

    await user.click(await sheet.findByRole('button', { name: 'Save as recipe' }))
    await user.click(sheet.getByRole('button', { name: 'Save recipe' }))

    expect(await sheet.findByText('Give the recipe a name')).toBeInTheDocument()
    expect(saveRecipe).not.toHaveBeenCalled()
  })
})
