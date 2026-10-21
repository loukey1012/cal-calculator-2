import { describe, expect, test } from 'vitest'
import { moveSteps } from './moveMeal'
import { mealItem } from './testData'

describe('moveSteps', () => {
  test('a dish moves by its portion, an old plain item by a copy', () => {
    const plain = mealItem({ id: 'plain', dish_portion_id: null })
    const fromDish = [
      mealItem({
        id: 'a',
        dish_portion_id: 'p1',
        dish_line_id: 'l1',
        dish: { id: 'd1', name: 'Chili', portionCount: 2, eaterCount: 2 },
      }),
      mealItem({
        id: 'b',
        dish_portion_id: 'p1',
        dish_line_id: 'l2',
        dish: { id: 'd1', name: 'Chili', portionCount: 2, eaterCount: 2 },
      }),
    ]

    expect(moveSteps([plain, ...fromDish])).toEqual([
      { kind: 'copy', items: [plain] },
      { kind: 'portion', dishId: 'd1', portionId: 'p1' },
    ])
  })
})
