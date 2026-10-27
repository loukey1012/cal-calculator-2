import { beforeEach, describe, expect, test, vi } from 'vitest'
import { fakeQuery } from '../../test/fakeQuery'

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { from: vi.fn() } }))
vi.mock('../../lib/supabase', () => ({ supabase: supabaseMock }))

import { sharedLine } from '../dishes/testData'
import { newAddFoodDraft, withDish, type AddFoodDraft } from './addFoodDraft'
import { draftNotice, sendDraftNotice } from './draftNotice'

function withLines(names: readonly string[], name: string | null = null): AddFoodDraft {
  const draft = newAddFoodDraft('me')
  return withDish(draft, {
    ...draft.dish,
    name,
    lines: names.map((line, index) => sharedLine(`l${index}`, line, 100, 100)),
  })
}

beforeEach(() => vi.clearAllMocks())

describe('draftNotice', () => {
  test('an empty draft or one with only a name tells nothing', () => {
    expect(draftNotice(newAddFoodDraft('me'))).toBeNull()
    expect(draftNotice(withLines([], 'Chili'))).toBeNull()
  })

  test('named by the dish name', () => {
    expect(draftNotice(withLines(['Mince', 'Beans', 'Rice'], 'Chili'))).toEqual({
      label: 'Chili',
      lineCount: 3,
    })
  })

  test('without a name, by its first ingredients', () => {
    expect(draftNotice(withLines(['Toast']))?.label).toBe('Toast')
    expect(draftNotice(withLines(['Toast', 'Jam']))?.label).toBe('Toast, Jam')
    expect(draftNotice(withLines(['Toast', 'Jam', 'Butter', 'Tea']))?.label).toBe('Toast, Jam +2')
  })
})

describe('draftNotice with ingredients to weigh', () => {
  const toWeigh = (names: readonly string[]) =>
    names.map((name, index) => ({ id: `w${index}`, ingredientId: `i${index}`, name }))

  function withPlaceholders(lines: readonly string[], waiting: readonly string[]): AddFoodDraft {
    const draft = withLines(lines)
    return withDish(draft, { ...draft.dish, toWeigh: toWeigh(waiting) })
  }

  test('a dish of only placeholders is still an unsaved dish', () => {
    expect(draftNotice(withPlaceholders([], ['Tomato']))).toEqual({
      label: 'Tomato',
      lineCount: 1,
    })
  })

  test('placeholders count and are named after the real lines', () => {
    expect(draftNotice(withPlaceholders(['Toast'], ['Jam', 'Butter']))).toEqual({
      label: 'Toast, Jam +1',
      lineCount: 3,
    })
  })
})

describe('sendDraftNotice', () => {
  test('a waiting dish is noted for me', async () => {
    const query = fakeQuery({ data: null, error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await sendDraftNotice('me', { label: 'Chili', lineCount: 3 })

    expect(supabaseMock.from).toHaveBeenCalledWith('cook_drafts')
    expect(query.upsert).toHaveBeenCalledWith({ user_id: 'me', label: 'Chili', line_count: 3 })
  })

  test('no dish: the note is removed', async () => {
    const query = fakeQuery({ data: null, error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await sendDraftNotice('me', null)

    expect(query.delete).toHaveBeenCalled()
    expect(query.eq).toHaveBeenCalledWith('user_id', 'me')
  })

  test('a refused request throws', async () => {
    supabaseMock.from.mockReturnValueOnce(fakeQuery({ data: null, error: { message: 'nope' } }))

    await expect(sendDraftNotice('me', null)).rejects.toThrow('nope')
  })
})
