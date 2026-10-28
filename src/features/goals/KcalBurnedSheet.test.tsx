import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { renderWithProviders } from '../../test/render'

vi.mock('../household/householdApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../household/householdApi')>()),
  updateProfile: vi.fn(),
}))

import { updateProfile } from '../household/householdApi'
import { KcalBurnedSheet } from './KcalBurnedSheet'

function renderSheet(current: number | null = null) {
  const onClose = vi.fn()
  renderWithProviders(<KcalBurnedSheet open userId="u1" current={current} onClose={onClose} />)
  return { onClose }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(updateProfile).mockResolvedValue()
})

describe('KcalBurnedSheet', () => {
  test('saves the figure on the profile and closes', async () => {
    const user = userEvent.setup()
    const { onClose } = renderSheet()

    await user.type(screen.getByLabelText('Calories burned per day'), '2600')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith('u1', { kcal_burned: 2600 }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  test('pre-fills the current figure and clearing it saves "not set"', async () => {
    const user = userEvent.setup()
    renderSheet(2600)

    expect(screen.getByLabelText('Calories burned per day')).toHaveValue('2600')
    await user.clear(screen.getByLabelText('Calories burned per day'))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith('u1', { kcal_burned: null }))
  })

  test('refuses 0', async () => {
    const user = userEvent.setup()
    renderSheet()

    await user.type(screen.getByLabelText('Calories burned per day'), '0')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByText('Must be more than 0')).toBeInTheDocument()
    expect(updateProfile).not.toHaveBeenCalled()
  })

  test('explains what the figure is for', () => {
    renderSheet()

    expect(
      screen.getByText('Your total daily energy use, used for calories saved.'),
    ).toBeInTheDocument()
  })
})
