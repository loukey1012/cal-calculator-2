import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('./recentMealsApi', () => ({
  fetchRecentItems: vi.fn(),
  fetchRecentDishIds: vi.fn(),
  updateItemValues: vi.fn(),
}))
vi.mock('../dishes/dishesApi', () => ({ fetchDishes: vi.fn(), saveDish: vi.fn() }))

import { fetchDishes, saveDish } from '../dishes/dishesApi'
import { gramsItem, HER_LUNCH, ME_LUNCH, sharedLine, testDish } from '../dishes/testData'
import { applyToRecentMeals } from './applyToRecentMeals'
import { fetchRecentDishIds, fetchRecentItems, updateItemValues } from './recentMealsApi'
import { ingredient } from './testData'

const SKYR = ingredient({ id: 'skyr', name: 'Skyr', kcal_100: 70, protein_100: 12 })
const logged = { ...gramsItem('Skyr', 200, 62), ingredient_id: 'skyr' }
const MY_BREAKFAST = { userId: 'me', date: '2026-10-14', mealType: 'breakfast' as const }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchRecentItems).mockResolvedValue([])
  vi.mocked(fetchRecentDishIds).mockResolvedValue([])
  vi.mocked(fetchDishes).mockResolvedValue([])
  vi.mocked(updateItemValues).mockResolvedValue()
  vi.mocked(saveDish).mockResolvedValue()
})

describe('applyToRecentMeals', () => {
  test('rebuilds the recent plain food and dishes and names the meals they are in', async () => {
    // Arrange
    vi.mocked(fetchRecentItems).mockResolvedValue([
      { id: 'item-1', item: logged, meal: MY_BREAKFAST },
    ])
    vi.mocked(fetchRecentDishIds).mockResolvedValue(['dish-1'])
    const dish = testDish({
      lines: [
        sharedLine('l-mince', 'Mince', 400, 250),
        { id: 'l-skyr', allocation: 'shared', item: logged, amounts: {} },
      ],
    })
    vi.mocked(fetchDishes).mockResolvedValue([dish])

    // Act
    const meals = await applyToRecentMeals(SKYR, '2026-10-02')

    // Assert: the plain food
    expect(fetchRecentItems).toHaveBeenCalledWith('skyr', '2026-10-02')
    expect(updateItemValues).toHaveBeenCalledWith(
      'item-1',
      expect.objectContaining({ kcal: 70, protein: 12, basis_multiplier: 2 }),
    )
    // the dish, saved as a new revision of the one loaded
    expect(fetchDishes).toHaveBeenCalledWith(['dish-1'])
    const saved = vi.mocked(saveDish).mock.calls[0]?.[0]
    expect(saved?.baseRevision).toBe('rev-1')
    expect(saved?.dish.revision).not.toBe('rev-1')
    expect(saved?.dish.lines[1]?.item).toMatchObject({ kcal: 70, protein: 12 })
    expect(saved?.replaceItemIds).toEqual([])
    // both people's lunch from the dish, and my breakfast
    expect(meals).toEqual(expect.arrayContaining([MY_BREAKFAST, ME_LUNCH, HER_LUNCH]))
    expect(meals).toHaveLength(3)
  })

  test('leaves food alone whose amount can’t be measured any more', async () => {
    const inCups = { ...logged, entered_amount: 1, entered_unit: 'unit' as const }
    vi.mocked(fetchRecentItems).mockResolvedValue([
      { id: 'item-1', item: inCups, meal: MY_BREAKFAST },
    ])

    await expect(applyToRecentMeals(SKYR, '2026-10-02')).resolves.toEqual([])
    expect(updateItemValues).not.toHaveBeenCalled()
  })

  test('loads no dishes when none had the ingredient', async () => {
    await expect(applyToRecentMeals(SKYR, '2026-10-02')).resolves.toEqual([])
    expect(fetchDishes).not.toHaveBeenCalled()
    expect(saveDish).not.toHaveBeenCalled()
  })
})
