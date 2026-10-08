import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { renderWithProviders } from '../../test/render'

vi.mock('./weightApi', () => ({
  fetchWeights: vi.fn(),
  saveWeight: vi.fn(),
  deleteWeight: vi.fn(),
}))

import { DayWeight } from './DayWeight'
import { deleteWeight, fetchWeights, saveWeight } from './weightApi'

const TODAY = '2026-10-08'

function renderRow(date: string, isOwnDay = true) {
  return renderWithProviders(
    <DayWeight userId="u1" date={date} today={TODAY} isOwnDay={isOwnDay} />,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchWeights).mockResolvedValue([{ date: '2026-10-01', weightKg: 72.4 }])
  vi.mocked(saveWeight).mockResolvedValue()
  vi.mocked(deleteWeight).mockResolvedValue()
})

describe('DayWeight', () => {
  test('a weight counts until the next entry, and says since when', async () => {
    renderRow('2026-10-04')

    const row = await screen.findByRole('button', { name: /Weight/ })
    expect(row).toHaveTextContent('72.4 kg')
    expect(row).toHaveTextContent(/Since .*Oct.*1/)
  })

  test('before the first weight it offers to add one', async () => {
    renderRow('2026-09-20')

    expect(await screen.findByRole('button', { name: /Weight/ })).toHaveTextContent('Add weight')
  })

  test('setting the weight of a past day saves it for that day', async () => {
    // the server lists it from then on
    vi.mocked(saveWeight).mockImplementation(async (_userId, entry) => {
      vi.mocked(fetchWeights).mockResolvedValue([{ date: '2026-10-01', weightKg: 72.4 }, entry])
    })
    const user = userEvent.setup()
    renderRow('2026-10-04')

    await user.click(await screen.findByRole('button', { name: /Weight/ }))
    const sheet = within(screen.getByRole('dialog', { name: 'Weight' }))
    expect(sheet.getByLabelText('Day')).toHaveValue('2026-10-04')
    expect(sheet.queryByRole('button', { name: 'Delete weight' })).not.toBeInTheDocument()
    await user.clear(sheet.getByLabelText('Weight'))
    await user.type(sheet.getByLabelText('Weight'), '71,8')
    await user.click(sheet.getByRole('button', { name: 'Save' }))

    expect(saveWeight).toHaveBeenCalledWith('u1', { date: '2026-10-04', weightKg: 71.8 })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Weight/ })).toHaveTextContent('71.8 kg'),
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('a mistyped weight is pointed out instead of saved', async () => {
    const user = userEvent.setup()
    renderRow('2026-10-01')

    await user.click(await screen.findByRole('button', { name: /Weight/ }))
    const sheet = within(screen.getByRole('dialog', { name: 'Weight' }))
    await user.clear(sheet.getByLabelText('Weight'))
    await user.type(sheet.getByLabelText('Weight'), '7')
    await user.click(sheet.getByRole('button', { name: 'Save' }))

    expect(sheet.getByText('Between 20 and 400 kg')).toBeInTheDocument()
    expect(saveWeight).not.toHaveBeenCalled()
  })

  test('the day’s own entry can be deleted', async () => {
    const user = userEvent.setup()
    renderRow('2026-10-01')

    await user.click(await screen.findByRole('button', { name: /Weight/ }))
    await user.click(screen.getByRole('button', { name: 'Delete weight' }))

    expect(deleteWeight).toHaveBeenCalledWith('u1', '2026-10-01')
  })

  test('a partner’s weight is shown, not changed', async () => {
    renderRow('2026-10-04', false)

    expect(await screen.findByText('72.4 kg')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Weight/ })).not.toBeInTheDocument()
  })
})
