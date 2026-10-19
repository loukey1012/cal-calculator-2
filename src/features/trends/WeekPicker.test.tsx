import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { renderWithProviders } from '../../test/render'

vi.mock('./trendsApi', () => ({ fetchNutritionDays: vi.fn() }))

import type { NutritionDay } from './trends'
import { fetchNutritionDays } from './trendsApi'
import { WeekPicker } from './WeekPicker'

const TODAY = '2026-10-21'

function day(date: string, kcal: number): NutritionDay {
  return {
    date,
    kcal,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    estimated: false,
    mealCount: 3,
    lunchLogged: true,
    dinnerLogged: true,
  }
}

/** The picker with the chosen week kept like TrendsView keeps it. */
function Picker() {
  const [monday, setMonday] = useState('2026-10-19')
  return (
    <>
      <WeekPicker userId="u1" today={TODAY} monday={monday} onChange={setMonday} />
      <output data-testid="chosen">{monday}</output>
    </>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  // entries in two earlier weeks, with an empty week between them
  vi.mocked(fetchNutritionDays).mockResolvedValue([
    day('2026-09-29', 2100),
    day('2026-10-06', 1800),
    day('2026-10-07', 2200),
  ])
})

describe('WeekPicker', () => {
  test('shows the chosen week; the arrows skip weeks without an entry', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Picker />)
    const older = screen.getByRole('button', { name: 'Earlier week' })
    const newer = screen.getByRole('button', { name: 'Later week' })
    expect(screen.getByRole('button', { name: /Week 43/ })).toHaveTextContent('This week')
    expect(newer).toBeDisabled()

    await waitFor(() => expect(older).toBeEnabled())
    await user.click(older)
    expect(screen.getByTestId('chosen')).toHaveTextContent('2026-10-05')
    expect(screen.getByRole('button', { name: /Week 41/ })).toBeInTheDocument()
    await user.click(older)
    expect(screen.getByTestId('chosen')).toHaveTextContent('2026-09-28')
    expect(older).toBeDisabled()

    await user.click(newer)
    expect(screen.getByTestId('chosen')).toHaveTextContent('2026-10-05')
    expect(fetchNutritionDays).toHaveBeenCalledWith('u1', '2000-01-01', TODAY)
  })

  test('the week opens a list of every week with an entry, newest first, to jump to', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Picker />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Earlier week' })).toBeEnabled())

    await user.click(screen.getByRole('button', { name: /Week 43/ }))
    const sheet = screen.getByRole('dialog', { name: 'Weeks' })
    const rows = within(sheet).getAllByRole('button', { name: /^Week/ })
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringMatching(/Week 43.*This week/),
      expect.stringMatching(/Week 41.*Ø 2,000 kcal/),
      expect.stringMatching(/Week 40.*Ø 2,100 kcal/),
    ])
    await user.click(rows[2]!)

    expect(screen.getByTestId('chosen')).toHaveTextContent('2026-09-28')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
