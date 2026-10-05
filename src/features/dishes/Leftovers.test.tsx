import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { CurrentUserContext } from '../../app/currentUser'
import { renderWithProviders } from '../../test/render'
import { dayMeal } from '../meals/testData'

vi.mock('../meals/mealsApi', () => ({
  fetchDay: vi.fn(),
  addMealItem: vi.fn(),
  updateMealItem: vi.fn(),
  deleteMealItem: vi.fn(),
}))
vi.mock('../goals/goalsApi', () => ({ fetchGoals: vi.fn(), saveGoal: vi.fn() }))
vi.mock('../household/householdApi', () => ({ fetchMembers: vi.fn() }))
vi.mock('../ingredients/ingredientsApi', () => ({
  fetchIngredients: vi.fn().mockResolvedValue([]),
  fetchCategories: vi.fn().mockResolvedValue([]),
}))
vi.mock('./dishesApi', () => ({
  fetchDish: vi.fn(),
  saveDish: vi.fn(),
  deleteDish: vi.fn(),
  fetchLeftoverDishes: vi.fn(),
}))

import { fetchGoals } from '../goals/goalsApi'
import { fetchMembers } from '../household/householdApi'
import { fetchDay } from '../meals/mealsApi'
import { TodayPage } from '../today/TodayPage'
import { fetchLeftoverDishes, saveDish } from './dishesApi'
import type { Dish } from './portions'
import { gramsItem } from './testData'

const TODAY = '2026-10-01'
const PROFILE = {
  id: 'u1',
  household_id: 'h1',
  display_name: 'Lukas',
  accent_color: '#007aff',
  appearance: {},
  created_at: '',
  updated_at: '',
}
const CHILI: Dish = {
  id: 'dish-1',
  name: 'Chili',
  splitMode: 'equal',
  cookedWeightG: null,
  revision: 'rev-1',
  portions: [
    {
      id: 'p-me',
      eater: { userId: 'u1', date: '2026-09-30', mealType: 'dinner' },
      splitValue: null,
    },
    { id: 'p-rest', eater: null, splitValue: null },
  ],
  lines: [{ id: 'l-mince', allocation: 'shared', item: gramsItem('Mince', 400, 250), amounts: {} }],
}

function renderToday() {
  renderWithProviders(
    <CurrentUserContext value={{ profile: PROFILE, householdId: 'h1' }}>
      <TodayPage />
    </CurrentUserContext>,
  )
}

function sentDish(): Dish {
  const call = vi.mocked(saveDish).mock.calls.at(-1)
  if (!call) throw new Error('saveDish was not called')
  return call[0].dish
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 1, 12, 0, 0))
  vi.mocked(fetchDay).mockResolvedValue([dayMeal('m1', 'lunch', [])])
  vi.mocked(fetchGoals).mockResolvedValue([])
  vi.mocked(fetchMembers).mockResolvedValue([PROFILE])
  vi.mocked(fetchLeftoverDishes).mockResolvedValue([CHILI])
  vi.mocked(saveDish).mockResolvedValue()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('leftovers on Today', () => {
  test('shows that food is left and logs it into a meal of today', async () => {
    const user = userEvent.setup()
    renderToday()

    await user.click(await screen.findByRole('button', { name: /Chili left/ }))
    const sheet = within(screen.getByRole('dialog', { name: 'Leftovers' }))
    await user.click(sheet.getByRole('button', { name: /Chili.*500 kcal/ }))
    await user.click(sheet.getByRole('button', { name: 'Add to Lunch' }))

    expect(sentDish().portions[1]).toMatchObject({
      id: 'p-rest',
      eater: { userId: 'u1', date: TODAY, mealType: 'lunch' },
    })
  })

  test('can be thrown away', async () => {
    const user = userEvent.setup()
    renderToday()

    await user.click(await screen.findByRole('button', { name: /Chili left/ }))
    const sheet = within(screen.getByRole('dialog', { name: 'Leftovers' }))
    await user.click(sheet.getByRole('button', { name: /Chili/ }))
    // still being sent: Today updates right away
    vi.mocked(saveDish).mockReturnValueOnce(new Promise(() => {}))
    await user.click(sheet.getByRole('button', { name: 'Throw away' }))

    expect(sentDish().portions[1]).toMatchObject({ id: 'p-rest', eater: null, discarded: true })
    // gone from Today at once
    expect(screen.queryByRole('button', { name: /Chili left/ })).not.toBeInTheDocument()
  })

  test('nothing shows without leftovers', async () => {
    vi.mocked(fetchLeftoverDishes).mockResolvedValue([])
    renderToday()

    await screen.findByTestId('day-total')
    expect(screen.queryByRole('button', { name: /left/ })).not.toBeInTheDocument()
  })
})
