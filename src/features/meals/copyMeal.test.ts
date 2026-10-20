import { describe, expect, test } from 'vitest'
import { copiedDishes } from './copyMeal'
import { mealItem } from './testData'

const TARGET = { userId: 'her', date: '2026-10-20', mealType: 'dinner' as const }

function dishItem(id: string, portionId: string, dish: { id: string; name: string | null }) {
  return mealItem({
    id,
    name: `Food ${id}`,
    dish_portion_id: portionId,
    dish_line_id: `line-${id}`,
    dish: { ...dish, portionCount: 2 },
  })
}

describe('copiedDishes', () => {
  test('each dish of the meal becomes a new dish for the target, with the logged values', () => {
    // Arrange
    const items = [
      dishItem('a', 'p-1', { id: 'd-1', name: 'Chili' }),
      dishItem('b', 'p-1', { id: 'd-1', name: 'Chili' }),
      mealItem({ id: 'c', name: 'Apple', entered_amount: 150, kcal: 52 }),
    ]

    // Act
    const dishes = copiedDishes(items, TARGET)

    // Assert
    expect(dishes).toHaveLength(2)
    const [chili, apple] = dishes
    expect(chili?.name).toBe('Chili')
    expect(chili?.lines.map((line) => line.item.name)).toEqual(['Food a', 'Food b'])
    expect(apple?.name).toBeNull()
    expect(apple?.lines[0]?.item).toMatchObject({ name: 'Apple', entered_amount: 150, kcal: 52 })
    for (const dish of dishes) {
      expect(dish.portions).toEqual([{ id: expect.any(String), eater: TARGET, splitValue: null }])
      expect(dish.lines.every((line) => line.allocation === 'shared')).toBe(true)
    }
    expect(chili?.id).not.toBe('d-1')
  })

  test('an estimate stays an estimate', () => {
    const items = [
      mealItem({
        id: 'x',
        dish_portion_id: 'p-x',
        dish_line_id: 'l-x',
        dish: { id: 'd-x', name: 'Pizza out', kcalEstimated: true },
      }),
    ]

    const [pizza] = copiedDishes(items, TARGET)

    expect(pizza?.kcalEstimated).toBe(true)
  })

  test('an empty meal copies nothing', () => {
    expect(copiedDishes([], TARGET)).toEqual([])
  })
})
