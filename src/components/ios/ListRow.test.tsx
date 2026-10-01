import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { ListRow } from './ListRow'

describe('ListRow', () => {
  test('shows title, subtitle and trailing detail', () => {
    render(<ListRow title="Lunch" subtitle="3 items" detail="612 kcal" />)

    expect(screen.getByText('Lunch')).toBeInTheDocument()
    expect(screen.getByText('3 items')).toBeInTheDocument()
    expect(screen.getByText('612 kcal')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  test('is a button with a chevron when tappable', async () => {
    const onClick = vi.fn()
    render(<ListRow title="Lunch" detail="612 kcal" onClick={onClick} />)

    await userEvent.click(screen.getByRole('button', { name: /Lunch/ }))

    expect(onClick).toHaveBeenCalled()
    expect(screen.getByTestId('chevron')).toBeInTheDocument()
  })
})
