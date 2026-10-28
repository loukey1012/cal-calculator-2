import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { renderWithProviders } from '../../test/render'

vi.mock('./goalsApi', () => ({ fetchGoals: vi.fn(), saveGoal: vi.fn() }))

import { GoalSheet } from './GoalSheet'
import { saveGoal } from './goalsApi'

const CURRENT = {
  validFrom: '2026-09-01',
  kcal: 2000,
  proteinG: 120,
  carbsG: null,
  fatG: null,
  fiberG: null,
  weightGoalKg: null,
}

function renderSheet(current = CURRENT as typeof CURRENT | null) {
  const onClose = vi.fn()
  renderWithProviders(
    <GoalSheet open userId="u1" date="2026-10-02" current={current} onClose={onClose} />,
  )
  return { onClose }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 2, 9, 0))
  vi.mocked(saveGoal).mockResolvedValue()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('GoalSheet', () => {
  test('pre-fills the current goal and saves a new one valid from the day it was opened for', async () => {
    const user = userEvent.setup()
    const { onClose } = renderSheet()

    expect(screen.getByLabelText('Calories')).toHaveValue('2000')
    await user.clear(screen.getByLabelText('Calories'))
    await user.type(screen.getByLabelText('Calories'), '1800')
    await user.type(screen.getByLabelText('Fat'), '60')
    await user.type(screen.getByLabelText('Fiber'), '30')
    await user.type(screen.getByLabelText('Target weight'), '68,5')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(saveGoal).toHaveBeenCalledWith('u1', '2026-10-02', {
      kcal: 1800,
      proteinG: 120,
      carbsG: null,
      fatG: 60,
      fiberG: 30,
      weightGoalKg: 68.5,
    })
  })

  test('requires a calorie goal', async () => {
    const user = userEvent.setup()
    renderSheet(null)

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByText('Enter your calorie goal')).toBeInTheDocument()
    expect(saveGoal).not.toHaveBeenCalled()
  })

  test('explains when saving fails', async () => {
    vi.mocked(saveGoal).mockRejectedValue(new TypeError('Load failed'))
    const user = userEvent.setup()
    const { onClose } = renderSheet()

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No connection.')
    expect(onClose).not.toHaveBeenCalled()
  })
})
