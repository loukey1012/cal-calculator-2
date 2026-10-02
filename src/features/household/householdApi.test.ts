import { beforeEach, describe, expect, test, vi } from 'vitest'
import { fakeQuery } from '../../test/fakeQuery'

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { from: vi.fn(), rpc: vi.fn() } }))
vi.mock('../../lib/supabase', () => ({ supabase: supabaseMock }))

import { ApiError } from '../../lib/errors'
import {
  createHousehold,
  fetchHousehold,
  fetchMembers,
  fetchProfile,
  joinHousehold,
  updateProfile,
} from './householdApi'

const PROFILE = { id: 'u1', household_id: 'h1', display_name: 'Lukas', accent_color: '#007aff' }
const HOUSEHOLD = { id: 'h1', name: 'Home', invite_code: '4Y5RFXKYMJ4P' }
const DB_ERROR = { message: 'permission denied', code: '42501' }

beforeEach(() => vi.clearAllMocks())

describe('householdApi', () => {
  test('fetchProfile reads the profile row by id', async () => {
    const query = fakeQuery({ data: PROFILE, error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await expect(fetchProfile('u1')).resolves.toEqual(PROFILE)
    expect(supabaseMock.from).toHaveBeenCalledWith('profiles')
    expect(query.eq).toHaveBeenCalledWith('id', 'u1')
  })

  test('fetchHousehold reads the household by id', async () => {
    const query = fakeQuery({ data: HOUSEHOLD, error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await expect(fetchHousehold('h1')).resolves.toEqual(HOUSEHOLD)
    expect(supabaseMock.from).toHaveBeenCalledWith('households')
  })

  test('fetchMembers lists the household’s profiles by name', async () => {
    const query = fakeQuery({ data: [PROFILE], error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await expect(fetchMembers('h1')).resolves.toEqual([PROFILE])
    expect(query.eq).toHaveBeenCalledWith('household_id', 'h1')
    expect(query.order).toHaveBeenCalledWith('display_name')
  })

  test.each([
    ['fetchProfile', () => fetchProfile('u1')],
    ['fetchHousehold', () => fetchHousehold('h1')],
    ['fetchMembers', () => fetchMembers('h1')],
  ])('%s turns database errors into ApiError', async (_name, call) => {
    supabaseMock.from.mockReturnValueOnce(fakeQuery({ data: null, error: DB_ERROR }))

    const error = await call().catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ message: 'permission denied', code: '42501' })
  })

  test('createHousehold calls the RPC with the name', async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: HOUSEHOLD, error: null })

    await expect(createHousehold('Home')).resolves.toEqual(HOUSEHOLD)
    expect(supabaseMock.rpc).toHaveBeenCalledWith('create_household', { p_name: 'Home' })
  })

  test('joinHousehold calls the RPC with the code and surfaces errors', async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: HOUSEHOLD, error: null })
    await expect(joinHousehold('4Y5RFXKYMJ4P')).resolves.toEqual(HOUSEHOLD)
    expect(supabaseMock.rpc).toHaveBeenCalledWith('join_household', {
      p_invite_code: '4Y5RFXKYMJ4P',
    })

    supabaseMock.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'Invalid invite code' },
    })
    await expect(joinHousehold('AAAAAAAAAAAA')).rejects.toThrow('Invalid invite code')
  })

  test('updateProfile changes only the given fields of one profile', async () => {
    const query = fakeQuery({ data: null, error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await updateProfile('u1', { accent_color: '#ff2d55' })

    expect(supabaseMock.from).toHaveBeenCalledWith('profiles')
    expect(query.update).toHaveBeenCalledWith({ accent_color: '#ff2d55' })
    expect(query.eq).toHaveBeenCalledWith('id', 'u1')

    supabaseMock.from.mockReturnValueOnce(fakeQuery({ data: null, error: DB_ERROR }))
    await expect(updateProfile('u1', { display_name: 'x' })).rejects.toBeInstanceOf(ApiError)
  })

  test('createHousehold surfaces errors', async () => {
    supabaseMock.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'You are already in a household' },
    })

    await expect(createHousehold('Home')).rejects.toBeInstanceOf(ApiError)
  })
})
