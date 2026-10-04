import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'
import { ScreenInfo } from './ScreenInfo'

describe('ScreenInfo', () => {
  test('lists the viewport measurements in a sheet', async () => {
    const user = userEvent.setup()
    render(<ScreenInfo />)

    await user.click(screen.getByRole('button', { name: /Screen info/ }))

    const sheet = screen.getByRole('dialog', { name: 'Screen info' })
    expect(within(sheet).getByText('window.innerHeight')).toBeInTheDocument()
    expect(within(sheet).getByText('safe-area bottom')).toBeInTheDocument()
    expect(within(sheet).getByText('Home-screen app')).toBeInTheDocument()
  })
})
