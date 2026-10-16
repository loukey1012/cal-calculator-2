import { beforeEach, describe, expect, test, vi } from 'vitest'
import { fakeQuery } from '../../test/fakeQuery'

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { from: vi.fn() } }))
vi.mock('../../lib/supabase', () => ({ supabase: supabaseMock }))

import { ApiError } from '../../lib/errors'
import { decideFinding, fetchOpenFindings, patchIngredient } from './reviewApi'
import { finding } from './testData'

const TYPO = finding({ id: 'f1' })

beforeEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('reviewApi', () => {
  test('fetchOpenFindings lists the household’s open findings, oldest first', async () => {
    const query = fakeQuery({ data: [TYPO], error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await expect(fetchOpenFindings('h1')).resolves.toEqual([TYPO])
    expect(supabaseMock.from).toHaveBeenCalledWith('review_findings')
    expect(query.eq).toHaveBeenCalledWith('household_id', 'h1')
    expect(query.eq).toHaveBeenCalledWith('status', 'open')
    expect(query.order).toHaveBeenCalledWith('created_at')
  })

  test('decideFinding records the decision, who made it and when', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-16T10:00:00Z') })
    const query = fakeQuery({ data: null, error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await decideFinding('f1', 'ignored', 'u1')

    expect(query.update).toHaveBeenCalledWith({
      status: 'ignored',
      decided_by: 'u1',
      decided_at: '2026-10-16T10:00:00.000Z',
    })
    expect(query.eq).toHaveBeenCalledWith('id', 'f1')
  })

  test('patchIngredient changes only the given fields and returns the ingredient', async () => {
    const query = fakeQuery({ data: { id: 'i1', name: 'Butter' }, error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await expect(patchIngredient('i1', { name: 'Butter' })).resolves.toMatchObject({
      name: 'Butter',
    })
    expect(supabaseMock.from).toHaveBeenCalledWith('ingredients')
    expect(query.update).toHaveBeenCalledWith({ name: 'Butter' })
    expect(query.eq).toHaveBeenCalledWith('id', 'i1')
  })

  test('errors become ApiErrors', async () => {
    supabaseMock.from.mockReturnValueOnce(
      fakeQuery({ data: null, error: { message: 'permission denied', code: '42501' } }),
    )

    await expect(fetchOpenFindings('h1')).rejects.toBeInstanceOf(ApiError)
  })
})
