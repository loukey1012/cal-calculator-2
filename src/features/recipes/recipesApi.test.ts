import { beforeEach, describe, expect, test, vi } from 'vitest'
import { fakeQuery } from '../../test/fakeQuery'

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { from: vi.fn(), rpc: vi.fn() } }))
vi.mock('../../lib/supabase', () => ({ supabase: supabaseMock }))

import { ApiError } from '../../lib/errors'
import { gramsItem } from '../dishes/testData'
import { deleteRecipe, fetchRecipes, saveRecipe } from './recipesApi'
import type { Recipe } from './recipeModel'

const DB_ERROR = { message: 'permission denied', code: '42501' }

beforeEach(() => vi.clearAllMocks())

function lineRow(id: string, position: number, allocation: string, amounts: object[] = []) {
  return {
    ...gramsItem(`Line ${id}`, 200, 100),
    id,
    recipe_id: 'r-1',
    position,
    allocation,
    recipe_line_amounts: amounts,
  }
}

describe('fetchRecipes', () => {
  test('loads the recipes with portions and lines in their order', async () => {
    // Arrange
    const row = {
      id: 'r-1',
      household_id: 'h1',
      name: 'Noodles',
      split_mode: 'count',
      cooked_weight_g: null,
      kcal_estimated: true,
      created_by: 'me',
      created_at: '',
      updated_at: '',
      recipe_portions: [
        { id: 'p-her', recipe_id: 'r-1', position: 1, user_id: 'her', split_value: 2 },
        { id: 'p-me', recipe_id: 'r-1', position: 0, user_id: 'me', split_value: 3 },
      ],
      recipe_lines: [
        lineRow('l2', 1, 'per_portion', [
          { recipe_id: 'r-1', line_id: 'l2', portion_id: 'p-me', amount: 120 },
          { recipe_id: 'r-1', line_id: 'l2', portion_id: 'p-her', amount: 80 },
        ]),
        lineRow('l1', 0, 'shared'),
      ],
    }
    const query = fakeQuery({ data: [row], error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    // Act
    const [recipe] = await fetchRecipes()

    // Assert
    expect(supabaseMock.from).toHaveBeenCalledWith('recipes')
    expect(recipe).toEqual({
      id: 'r-1',
      name: 'Noodles',
      splitMode: 'count',
      cookedWeightG: null,
      kcalEstimated: true,
      portions: [
        { id: 'p-me', userId: 'me', splitValue: 3 },
        { id: 'p-her', userId: 'her', splitValue: 2 },
      ],
      lines: [
        { id: 'l1', allocation: 'shared', item: gramsItem('Line l1', 200, 100), amounts: {} },
        {
          id: 'l2',
          allocation: 'per_portion',
          item: gramsItem('Line l2', 200, 100),
          amounts: { 'p-me': 120, 'p-her': 80 },
        },
      ],
    })
  })

  test('throws an ApiError when loading fails', async () => {
    supabaseMock.from.mockReturnValueOnce(fakeQuery({ data: null, error: DB_ERROR }))

    await expect(fetchRecipes()).rejects.toBeInstanceOf(ApiError)
  })
})

describe('saveRecipe', () => {
  test('sends the whole recipe with own amounts per portion', async () => {
    // Arrange
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: null })
    const recipe: Recipe = {
      id: 'r-1',
      name: 'Bowl',
      splitMode: 'equal',
      cookedWeightG: null,
      kcalEstimated: false,
      portions: [{ id: 'p-me', userId: 'me', splitValue: null }],
      lines: [
        {
          id: 'l1',
          allocation: 'per_portion',
          item: gramsItem('Rice', 150, 130),
          amounts: { 'p-me': 150 },
        },
      ],
    }

    // Act
    await saveRecipe(recipe)

    // Assert
    expect(supabaseMock.rpc).toHaveBeenCalledWith('save_recipe', {
      p_recipe: {
        id: 'r-1',
        name: 'Bowl',
        split_mode: 'equal',
        cooked_weight_g: null,
        kcal_estimated: false,
        portions: [{ id: 'p-me', user_id: 'me', split_value: null }],
        lines: [
          {
            ...gramsItem('Rice', 150, 130),
            id: 'l1',
            allocation: 'per_portion',
            amounts: [{ portion_id: 'p-me', amount: 150 }],
          },
        ],
      },
    })
  })

  test('a refused delete throws', async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: DB_ERROR })

    await expect(deleteRecipe('r-1')).rejects.toBeInstanceOf(ApiError)
    expect(supabaseMock.rpc).toHaveBeenCalledWith('delete_recipe', { p_recipe_id: 'r-1' })
  })
})
