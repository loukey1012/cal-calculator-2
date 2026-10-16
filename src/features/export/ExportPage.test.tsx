import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { CurrentUserContext } from '../../app/currentUser'
import { renderWithProviders } from '../../test/render'

vi.mock('./exportApi', () => ({ fetchExportData: vi.fn() }))
vi.mock('../household/householdApi', () => ({
  fetchMembers: vi.fn(),
  fetchHousehold: vi.fn(() => new Promise(() => {})),
}))
vi.mock('../goals/goalsApi', () => ({ fetchGoals: vi.fn(() => new Promise(() => {})) }))
vi.mock('../auth/authApi', () => ({ signOut: vi.fn() }))

import { fetchMembers } from '../household/householdApi'
import { SettingsPage } from '../settings/SettingsPage'
import { fetchExportData } from './exportApi'

const ME = {
  id: 'u1',
  household_id: 'h1',
  display_name: 'Lukas',
  accent_color: '#007aff',
  appearance: {},
  created_at: '',
  updated_at: '',
}
const PARTNER = { ...ME, id: 'u2', display_name: 'Anna' }
const DATA = {
  people: [],
  meals: [
    {
      user_id: 'u1',
      date: '2026-10-14',
      meal_type: 'lunch' as const,
      meal_items: [
        {
          name: 'Soup',
          brand: null,
          entered_amount: 300,
          entered_unit: 'g' as const,
          basis_multiplier: 3,
          kcal: 40,
          protein: null,
          carbs: null,
          sugar: null,
          fat: null,
          sat_fat: null,
          fiber: null,
          salt: null,
          estimated: false,
        },
      ],
    },
  ],
  days: [],
  weights: [],
}

function renderExport(route = '/settings/export') {
  return renderWithProviders(
    <CurrentUserContext value={{ profile: ME, householdId: 'h1' }}>
      <SettingsPage />
    </CurrentUserContext>,
    { route },
  )
}

const share = vi.fn()
const canShare = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 15, 12, 0))
  vi.mocked(fetchMembers).mockResolvedValue([ME, PARTNER])
  vi.mocked(fetchExportData).mockResolvedValue(DATA)
  share.mockResolvedValue(undefined)
  canShare.mockReturnValue(true)
  Object.assign(navigator, { share, canShare })
})

afterEach(() => {
  vi.useRealTimers()
  Object.assign(navigator, { share: undefined, canShare: undefined })
})

describe('Settings › Export', () => {
  test('is offered in Settings', async () => {
    const user = userEvent.setup()
    renderExport('/settings')

    await user.click(screen.getByRole('button', { name: /Export/ }))

    expect(screen.getByRole('heading', { level: 1, name: 'Export' })).toBeInTheDocument()
  })

  test('starts with the last 30 days', () => {
    renderExport()

    expect(screen.getByLabelText('From')).toHaveValue('2026-09-16')
    expect(screen.getByLabelText('To')).toHaveValue('2026-10-15')
  })

  test('shares a foods file and a days file of both of you', async () => {
    const user = userEvent.setup()
    renderExport()
    await waitFor(() => expect(fetchMembers).toHaveBeenCalled())

    await user.click(await screen.findByRole('button', { name: 'Export' }))

    await waitFor(() => expect(share).toHaveBeenCalled())
    expect(fetchExportData).toHaveBeenCalledWith(
      [
        { id: 'u1', name: 'Lukas' },
        { id: 'u2', name: 'Anna' },
      ],
      '2026-09-16',
      '2026-10-15',
    )
    const files = share.mock.calls[0]?.[0]?.files as File[]
    expect(files.map(({ name }) => name)).toEqual([
      'calculator-foods-2026-09-16-to-2026-10-15.csv',
      'calculator-days-2026-09-16-to-2026-10-15.csv',
    ])
    expect(await files[0]?.text()).toContain('Soup')
  })

  test('without sharing (e.g. a desktop browser), both files are downloaded', async () => {
    canShare.mockReturnValue(false)
    const createObjectURL = vi.fn(() => 'blob:x')
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() })
    const user = userEvent.setup()
    renderExport()

    await user.click(await screen.findByRole('button', { name: 'Export' }))

    await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(2))
    expect(share).not.toHaveBeenCalled()
    expect(await screen.findByText('2 files downloaded.')).toBeInTheDocument()
  })

  test('a range that ends before it starts can’t be exported', async () => {
    const user = userEvent.setup()
    renderExport()

    await user.clear(screen.getByLabelText('From'))
    await user.type(screen.getByLabelText('From'), '2026-10-20')

    expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled()
    expect(screen.getByText('“From” must be on or before “To”.')).toBeInTheDocument()
  })

  test('a failed load says so', async () => {
    vi.mocked(fetchExportData).mockRejectedValue(new Error('offline'))
    const user = userEvent.setup()
    renderExport()

    await user.click(await screen.findByRole('button', { name: 'Export' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})
