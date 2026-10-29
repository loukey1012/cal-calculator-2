import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { CurrentUserContext } from '../../app/currentUser'
import { renderWithProviders } from '../../test/render'
import { ingredient } from '../ingredients/testData'
import { dayMeal, mealItem } from './testData'

vi.mock('../goals/goalsApi', () => ({ fetchGoals: vi.fn().mockResolvedValue([]) }))
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
  fetchDayMark: vi.fn().mockResolvedValue(null),
  fetchDayNote: vi.fn().mockResolvedValue(null),
  setCheatMeal: vi.fn(),
  setDayMark: vi.fn(),
}))
vi.mock('../ingredients/ingredientsApi', () => ({
  fetchIngredients: vi.fn(),
  fetchCategories: vi.fn().mockResolvedValue([]),
}))

import { fetchIngredients } from '../ingredients/ingredientsApi'
import { fetchDay } from './mealsApi'
import { MealContent } from './MealContent'

const PROFILE = {
  id: 'u1',
  household_id: 'h1',
  display_name: 'Lukas',
  accent_color: '#007aff',
  kcal_burned: null,
  appearance: {},
  created_at: '',
  updated_at: '',
}
const INGREDIENTS = [
  ingredient({ id: 'oats', name: 'Oats', vegan: true, halal: true }),
  ingredient({ id: 'tofu', name: 'Tofu', vegan: true }),
  ingredient({ id: 'salami', name: 'Salami' }),
]

const dishItem = (id: string, dishId: string, ingredientId: string | null, name: string) =>
  mealItem({
    id,
    name,
    ingredient_id: ingredientId,
    dish_portion_id: `p-${dishId}`,
    dish_line_id: `l-${id}`,
    dish: {
      id: dishId,
      name: dishId === 'bowl' ? 'Bowl' : 'Mixed',
      portionCount: 1,
      eaterCount: 1,
    },
  })

function renderMeal() {
  return renderWithProviders(
    <CurrentUserContext value={{ profile: PROFILE, householdId: 'h1' }}>
      <MealContent mealType="lunch" userId="u1" date="2026-10-01" />
    </CurrentUserContext>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchIngredients).mockResolvedValue(INGREDIENTS)
})

describe('diet marks on a dish and a meal', () => {
  test('a dish and the meal get a mark only when every ingredient has it', async () => {
    vi.mocked(fetchDay).mockResolvedValue([
      dayMeal('m1', 'lunch', [
        dishItem('a', 'bowl', 'oats', 'Oats'),
        dishItem('b', 'bowl', 'tofu', 'Tofu'),
      ]),
    ])
    renderMeal()

    const block = await screen.findByRole('button', { name: /Bowl/ })
    expect(await within(block).findByRole('img', { name: /vegan/ })).toBeInTheDocument()
    expect(within(block).queryByRole('img', { name: /halal/ })).not.toBeInTheDocument()
    expect(
      within(screen.getByTestId('meal-diet')).getByRole('img', { name: /vegan/ }),
    ).toBeInTheDocument()
  })

  test('an unmarked ingredient or a custom item takes the mark away', async () => {
    vi.mocked(fetchDay).mockResolvedValue([
      dayMeal('m1', 'lunch', [
        dishItem('a', 'mixed', 'oats', 'Oats'),
        dishItem('b', 'mixed', null, 'Restaurant sauce'),
        mealItem({ id: 'c', name: 'Tofu', ingredient_id: 'tofu' }),
      ]),
    ])
    renderMeal()

    // the plain Tofu row showing its mark proves the ingredients have loaded
    const tofu = await screen.findByRole('button', { name: /Tofu/ })
    expect(await within(tofu).findByRole('img', { name: /vegan/ })).toBeInTheDocument()
    const block = screen.getByRole('button', { name: /Mixed/ })
    expect(within(block).queryByRole('img', { name: /vegan/ })).not.toBeInTheDocument()
    expect(within(block).queryByRole('img', { name: /halal/ })).not.toBeInTheDocument()
    expect(
      within(screen.getByTestId('meal-diet')).queryByRole('img', { name: /vegan/ }),
    ).not.toBeInTheDocument()
  })

  test('a single plain food shows its ingredient’s marks', async () => {
    vi.mocked(fetchDay).mockResolvedValue([
      dayMeal('m1', 'lunch', [mealItem({ id: 'c', name: 'Tofu', ingredient_id: 'tofu' })]),
    ])
    renderMeal()

    const row = await screen.findByRole('button', { name: /Tofu/ })
    expect(await within(row).findByRole('img', { name: /vegan/ })).toBeInTheDocument()
  })
})
