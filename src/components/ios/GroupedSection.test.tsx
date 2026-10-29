import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { GroupedSection } from './GroupedSection'

describe('GroupedSection', () => {
  test('renders a plain heading without a header action', () => {
    render(<GroupedSection header="Fresh">rows</GroupedSection>)

    expect(screen.getByRole('heading', { level: 2, name: 'Fresh' })).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  test('the header becomes a named button that calls onHeaderClick', async () => {
    const onHeaderClick = vi.fn()
    const user = userEvent.setup()
    render(
      <GroupedSection header="Fresh" onHeaderClick={onHeaderClick}>
        rows
      </GroupedSection>,
    )

    const button = screen.getByRole('button', { name: 'Fresh, edit' })
    expect(screen.getByRole('heading', { level: 2, name: 'Fresh, edit' })).toContainElement(button)
    await user.click(button)

    expect(onHeaderClick).toHaveBeenCalledTimes(1)
  })

  test('without a header there is no action even if one is given', () => {
    render(<GroupedSection onHeaderClick={vi.fn()}>rows</GroupedSection>)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
