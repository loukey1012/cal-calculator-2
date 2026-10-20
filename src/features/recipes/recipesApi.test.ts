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

type SlotFlags = {
  readonly slot_id: string
  readonly optional?: boolean
  readonly picked?: boolean
  readonly left_out?: boolean
}

function lineRow(
  id: string,
  position: number,
  allocation: string,
  flags: SlotFlags,
  amounts: object[] = [],
) {
  return {
    ...gramsItem(`Line ${id}`, 200, 100),
    id,
    recipe_id: 'r-1',
    position,
    allocation,
    optional: false,
    picked: true,
    left_out: false,
    ...flags,
    recipe_line_amounts: amounts,
  }
}

describe('fetchRecipes', () => {
  test('loads the recipes: portions, and lines with their choices, in order', async () => {
    // Arrange
    const row = {
      id: 'r-1',
      household_id: 'h1',
      name: 'Toast',
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
        lineRow(
          'cheese',
          2,
          'per_portion',
          { slot_id: 's-cheese', optional: true, left_out: true },
          [
            { recipe_id: 'r-1', line_id: 'cheese', portion_id: 'p-me', amount: 120 },
            { recipe_id: 'r-1', line_id: 'cheese', portion_id: 'p-her', amount: 80 },
          ],
        ),
        lineRow('spar', 1, 'shared', { slot_id: 's-bread', picked: true }),
        lineRow('clever', 0, 'shared', { slot_id: 's-bread', picked: false }),
      ],
    }
    supabaseMock.from.mockReturnValueOnce(fakeQuery({ data: [row], error: null }))

    // Act
    const [recipe] = await fetchRecipes()

    // Assert
    expect(supabaseMock.from).toHaveBeenCalledWith('recipes')
    expect(recipe).toMatchObject({
      id: 'r-1',
      name: 'Toast',
      splitMode: 'count',
      kcalEstimated: true,
      portions: [
        { id: 'p-me', userId: 'me', splitValue: 3 },
        { id: 'p-her', userId: 'her', splitValue: 2 },
      ],
    })
    expect(recipe?.slots).toEqual([
      {
        id: 's-bread',
        optional: false,
        leftOut: false,
        pickedId: 'spar',
        choices: [
          {
            id: 'clever',
            allocation: 'shared',
            item: gramsItem('Line clever', 200, 100),
            amounts: {},
          },
          { id: 'spar', allocation: 'shared', item: gramsItem('Line spar', 200, 100), amounts: {} },
        ],
      },
      {
        id: 's-cheese',
        optional: true,
        leftOut: true,
        pickedId: 'cheese',
        choices: [
          {
            id: 'cheese',
            allocation: 'per_portion',
            item: gramsItem('Line cheese', 200, 100),
            amounts: { 'p-me': 120, 'p-her': 80 },
          },
        ],
      },
    ])
  })

  test('throws an ApiError when loading fails', async () => {
    supabaseMock.from.mockReturnValueOnce(fakeQuery({ data: null, error: DB_ERROR }))

    await expect(fetchRecipes()).rejects.toBeInstanceOf(ApiError)
  })
})

describe('saveRecipe', () => {
  test('sends every choice as a line with its slot’s flags and own amounts', async () => {
    // Arrange
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: null })
    const recipe: Recipe = {
      id: 'r-1',
      name: 'Bowl',
      splitMode: 'equal',
      cookedWeightG: null,
      kcalEstimated: false,
      portions: [{ id: 'p-me', userId: 'me', splitValue: null }],
      slots: [
        {
          id: 's-rice',
          optional: true,
          leftOut: false,
          pickedId: 'basmati',
          choices: [
            {
              id: 'jasmine',
              allocation: 'shared',
              item: gramsItem('Jasmine', 150, 130),
              amounts: {},
            },
            {
              id: 'basmati',
              allocation: 'per_portion',
              item: gramsItem('Basmati', 150, 130),
              amounts: { 'p-me': 150 },
            },
          ],
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
            ...gramsItem('Jasmine', 150, 130),
            id: 'jasmine',
            slot_id: 's-rice',
            optional: true,
            picked: false,
            left_out: false,
            allocation: 'shared',
            amounts: [],
          },
          {
            ...gramsItem('Basmati', 150, 130),
            id: 'basmati',
            slot_id: 's-rice',
            optional: true,
            picked: true,
            left_out: false,
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
