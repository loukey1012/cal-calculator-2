import { beforeEach, describe, expect, test, vi } from 'vitest'
import { fakeQuery } from '../../test/fakeQuery'

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { from: vi.fn(), rpc: vi.fn() } }))
vi.mock('../../lib/supabase', () => ({ supabase: supabaseMock }))

import { ApiError } from '../../lib/errors'
import {
  addMealItem,
  deleteMealItem,
  fetchDay,
  fetchDayMark,
  fetchDayNote,
  setCheatMeal,
  setDayMark,
  setDayNote,
  setMealNote,
  updateMealItem,
} from './mealsApi'
import { dayMeal, mealItem } from './testData'

const DRAFT = {
  ingredient_id: 'i1',
  name: 'Cream',
  brand: null,
  entered_amount: 150,
  entered_unit: 'g' as const,
  basis: 'per_100g' as const,
  basis_multiplier: 1.5,
  kcal: 92,
  protein: 1.3,
  carbs: null,
  sugar: null,
  fat: null,
  sat_fat: null,
  fiber: null,
  salt: null,
}
const DB_ERROR = { message: 'permission denied', code: '42501' }

beforeEach(() => vi.clearAllMocks())

describe('mealsApi', () => {
  test('fetchDay loads one user’s meals of a day with their items in logging order', async () => {
    const plain = mealItem({ id: 'plain' })
    const fromDish = mealItem({ id: 'dish-item', dish_portion_id: 'p1', dish_line_id: 'l1' })
    const rows = [
      {
        id: 'm1',
        meal_type: 'lunch',
        meal_items: [
          { ...plain, dish_portions: null },
          {
            ...fromDish,
            dish_portions: {
              dish_id: 'd1',
              dishes: {
                name: 'Chili',
                kcal_estimated: true,
                dish_portions: [{ user_id: 'u1' }, { user_id: 'u2' }, { user_id: null }],
              },
            },
          },
        ],
      },
    ]
    const query = fakeQuery({ data: rows, error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await expect(fetchDay('u1', '2026-10-01')).resolves.toEqual([
      dayMeal('m1', 'lunch', [
        { ...plain, dish: null },
        {
          ...fromDish,
          dish: { id: 'd1', name: 'Chili', portionCount: 3, eaterCount: 2, kcalEstimated: true },
        },
      ]),
    ])
    expect(supabaseMock.from).toHaveBeenCalledWith('meals')
    expect(query.select).toHaveBeenCalledWith(
      'id, meal_type, cheat_meal, note, meal_items(*, dish_portions(dish_id, dishes(name, kcal_estimated, dish_portions(user_id))))',
    )
    expect(query.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(query.eq).toHaveBeenCalledWith('date', '2026-10-01')
    expect(query.order).toHaveBeenCalledWith('created_at', { referencedTable: 'meal_items' })
  })

  test('setCheatMeal marks a meal of a day, or takes the mark back', async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: null })
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: DB_ERROR })

    await setCheatMeal({ userId: 'u1', date: '2026-10-01', mealType: 'dinner', cheatMeal: true })
    const refused = setCheatMeal({
      userId: 'u1',
      date: '2026-10-01',
      mealType: 'dinner',
      cheatMeal: false,
    })

    expect(supabaseMock.rpc).toHaveBeenCalledWith('set_cheat_meal', {
      p_user_id: 'u1',
      p_date: '2026-10-01',
      p_meal_type: 'dinner',
      p_cheat_meal: true,
    })
    await expect(refused).rejects.toBeInstanceOf(ApiError)
  })

  test('fetchDayMark tells whether a day is a cheat day, an alcohol day or neither', async () => {
    const cheat = fakeQuery({ data: { kind: 'cheat' }, error: null })
    const alcohol = fakeQuery({ data: { kind: 'alcohol' }, error: null })
    const none = fakeQuery({ data: null, error: null })
    supabaseMock.from
      .mockReturnValueOnce(cheat)
      .mockReturnValueOnce(alcohol)
      .mockReturnValueOnce(none)

    await expect(fetchDayMark('u1', '2026-10-01')).resolves.toBe('cheat')
    await expect(fetchDayMark('u1', '2026-10-02')).resolves.toBe('alcohol')
    await expect(fetchDayMark('u1', '2026-10-03')).resolves.toBeNull()
    expect(supabaseMock.from).toHaveBeenCalledWith('cheat_days')
    expect(cheat.select).toHaveBeenCalledWith('kind')
    expect(cheat.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(cheat.eq).toHaveBeenCalledWith('date', '2026-10-01')
    expect(cheat.maybeSingle).toHaveBeenCalled()
  })

  test('setDayMark switches the kind with a real upsert, and clears with a delete', async () => {
    const toCheat = fakeQuery({ data: null, error: null })
    const toAlcohol = fakeQuery({ data: null, error: null })
    const backToCheat = fakeQuery({ data: null, error: null })
    const clear = fakeQuery({ data: null, error: null })
    const refused = fakeQuery({ data: null, error: DB_ERROR })
    supabaseMock.from
      .mockReturnValueOnce(toCheat)
      .mockReturnValueOnce(toAlcohol)
      .mockReturnValueOnce(backToCheat)
      .mockReturnValueOnce(clear)
      .mockReturnValueOnce(refused)

    await setDayMark('u1', '2026-10-01', 'cheat')
    await setDayMark('u1', '2026-10-01', 'alcohol')
    await setDayMark('u1', '2026-10-01', 'cheat')
    await setDayMark('u1', '2026-10-01', null)

    // no ignoreDuplicates: an existing row of the other kind must be replaced
    expect(toCheat.upsert).toHaveBeenCalledWith(
      { user_id: 'u1', date: '2026-10-01', kind: 'cheat' },
      { onConflict: 'user_id,date' },
    )
    expect(toAlcohol.upsert).toHaveBeenCalledWith(
      { user_id: 'u1', date: '2026-10-01', kind: 'alcohol' },
      { onConflict: 'user_id,date' },
    )
    expect(backToCheat.upsert).toHaveBeenCalledWith(
      { user_id: 'u1', date: '2026-10-01', kind: 'cheat' },
      { onConflict: 'user_id,date' },
    )
    expect(clear.upsert).not.toHaveBeenCalled()
    expect(clear.delete).toHaveBeenCalled()
    expect(clear.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(clear.eq).toHaveBeenCalledWith('date', '2026-10-01')
    await expect(setDayMark('u1', '2026-10-01', 'alcohol')).rejects.toBeInstanceOf(ApiError)
  })

  test('setMealNote sends the note to set_meal_note', async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: null })

    await setMealNote({ userId: 'u1', date: '2026-10-01', mealType: 'dinner', note: 'Pizza' })

    expect(supabaseMock.rpc).toHaveBeenCalledWith('set_meal_note', {
      p_user_id: 'u1',
      p_date: '2026-10-01',
      p_meal_type: 'dinner',
      p_note: 'Pizza',
    })
  })

  test('fetchDayNote returns the note, or null without one', async () => {
    const noted = fakeQuery({ data: { note: 'Birthday' }, error: null })
    const none = fakeQuery({ data: null, error: null })
    supabaseMock.from.mockReturnValueOnce(noted).mockReturnValueOnce(none)

    await expect(fetchDayNote('u1', '2026-10-01')).resolves.toBe('Birthday')
    await expect(fetchDayNote('u1', '2026-10-02')).resolves.toBeNull()
    expect(supabaseMock.from).toHaveBeenCalledWith('day_notes')
    expect(noted.eq).toHaveBeenCalledWith('date', '2026-10-01')
  })

  test('setDayNote saves the trimmed note, and an empty one deletes it', async () => {
    const save = fakeQuery({ data: null, error: null })
    const remove = fakeQuery({ data: null, error: null })
    supabaseMock.from.mockReturnValueOnce(save).mockReturnValueOnce(remove)

    await setDayNote('u1', '2026-10-01', '  Birthday ')
    await setDayNote('u1', '2026-10-01', '  ')

    expect(save.upsert).toHaveBeenCalledWith(
      { user_id: 'u1', date: '2026-10-01', note: 'Birthday' },
      { onConflict: 'user_id,date' },
    )
    expect(remove.delete).toHaveBeenCalled()
    expect(remove.eq).toHaveBeenCalledWith('user_id', 'u1')
  })

  test('addMealItem makes sure the meal exists, then inserts the item under its client id', async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: 'meal-1', error: null })
    const query = fakeQuery({ data: null, error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await addMealItem({
      id: 'item-1',
      userId: 'u1',
      date: '2026-10-01',
      mealType: 'lunch',
      draft: DRAFT,
    })

    expect(supabaseMock.rpc).toHaveBeenCalledWith('ensure_meal', {
      p_user_id: 'u1',
      p_date: '2026-10-01',
      p_meal_type: 'lunch',
    })
    // a retried request must not create a second item
    expect(query.upsert).toHaveBeenCalledWith(
      { ...DRAFT, id: 'item-1', meal_id: 'meal-1' },
      { onConflict: 'id', ignoreDuplicates: true },
    )
  })

  test('addMealItem stops when the meal cannot be created', async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: DB_ERROR })

    await expect(
      addMealItem({ id: 'x', userId: 'u1', date: '2026-10-01', mealType: 'lunch', draft: DRAFT }),
    ).rejects.toBeInstanceOf(ApiError)
    expect(supabaseMock.from).not.toHaveBeenCalled()
  })

  test('updateMealItem patches the amount by id', async () => {
    const query = fakeQuery({ data: null, error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await updateMealItem('item-1', { entered_amount: 200, basis_multiplier: 2 })

    expect(supabaseMock.from).toHaveBeenCalledWith('meal_items')
    expect(query.update).toHaveBeenCalledWith({ entered_amount: 200, basis_multiplier: 2 })
    expect(query.eq).toHaveBeenCalledWith('id', 'item-1')
  })

  test('deleteMealItem deletes by id', async () => {
    const query = fakeQuery({ data: null, error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await deleteMealItem('item-1')

    expect(query.delete).toHaveBeenCalled()
    expect(query.eq).toHaveBeenCalledWith('id', 'item-1')
  })

  test.each([
    ['fetchDay', () => fetchDay('u1', '2026-10-01')],
    ['updateMealItem', () => updateMealItem('i', { entered_amount: 1, basis_multiplier: 1 })],
    ['deleteMealItem', () => deleteMealItem('i')],
  ])('%s turns database errors into ApiError', async (_name, call) => {
    supabaseMock.from.mockReturnValueOnce(fakeQuery({ data: null, error: DB_ERROR }))

    await expect(call()).rejects.toBeInstanceOf(ApiError)
  })

  test('addMealItem surfaces item insert errors', async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: 'meal-1', error: null })
    supabaseMock.from.mockReturnValueOnce(fakeQuery({ data: null, error: DB_ERROR }))

    await expect(
      addMealItem({ id: 'x', userId: 'u1', date: '2026-10-01', mealType: 'lunch', draft: DRAFT }),
    ).rejects.toBeInstanceOf(ApiError)
  })
})
