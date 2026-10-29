import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { CalendarOptionsMenu } from './CalendarOptionsMenu'
import { FilterMenu } from './FilterMenu'
import { FilterPill } from './FilterPill'

describe('FilterMenu', () => {
  test('is a plain Filter button while nothing is highlighted', () => {
    render(<FilterMenu filter={null} onChange={vi.fn()} />)

    const button = screen.getByRole('button', { name: 'Filter' })
    expect(button).toHaveAttribute('aria-haspopup', 'dialog')
    expect(button).not.toHaveClass('text-accent-ink')
  })

  test('names the active filter on the button and tints it', () => {
    render(<FilterMenu filter="notes" onChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Filter: Notes' })).toHaveClass('text-accent-ink')
  })

  test('lists the filters with a check on the active one', async () => {
    const user = userEvent.setup()
    render(<FilterMenu filter="alcohol" onChange={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Filter: Alcohol' }))

    const menu = screen.getByRole('dialog', { name: 'Highlight days' })
    for (const name of ['Show all', 'Notes', 'Cheat', 'Missing']) {
      expect(within(menu).getByRole('button', { name })).toBeInTheDocument()
    }
    expect(within(menu).getByRole('button', { name: 'Alcohol, selected' })).toBeInTheDocument()
  })

  test('the choices show a check, not a disclosure chevron', async () => {
    const user = userEvent.setup()
    render(<FilterMenu filter="alcohol" onChange={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Filter: Alcohol' }))

    expect(screen.queryByTestId('chevron')).not.toBeInTheDocument()
  })

  test('picking a filter chooses it and closes the menu', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<FilterMenu filter={null} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Filter' }))
    await user.click(screen.getByRole('button', { name: 'Cheat' }))

    expect(onChange).toHaveBeenCalledWith('cheat')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('picking the active filter again clears it', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<FilterMenu filter="missing" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Filter: Missing' }))
    await user.click(screen.getByRole('button', { name: 'Missing, selected' }))

    expect(onChange).toHaveBeenCalledWith(null)
  })

  test('Show all clears the filter', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<FilterMenu filter="notes" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Filter: Notes' }))
    await user.click(screen.getByRole('button', { name: 'Show all' }))

    expect(onChange).toHaveBeenCalledWith(null)
  })
})

describe('CalendarOptionsMenu', () => {
  test('offers to show the key while it is hidden', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<CalendarOptionsMenu keyShown={false} onChangeKeyShown={onChange} />)

    const button = screen.getByRole('button', { name: 'Calendar options' })
    expect(button).toHaveAttribute('aria-haspopup', 'dialog')
    await user.click(button)
    await user.click(screen.getByRole('button', { name: 'Show key' }))

    expect(onChange).toHaveBeenCalledWith(true)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('offers to hide the key while it is shown', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<CalendarOptionsMenu keyShown onChangeKeyShown={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Calendar options' }))
    await user.click(screen.getByRole('button', { name: 'Hide key' }))

    expect(onChange).toHaveBeenCalledWith(false)
  })

  test('offers only the key: the week and the year have their own buttons', async () => {
    const user = userEvent.setup()
    render(<CalendarOptionsMenu keyShown={false} onChangeKeyShown={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Calendar options' }))

    const rows = within(screen.getByRole('dialog'))
      .getAllByRole('button')
      .filter((button) => button.textContent !== 'Close')
    expect(rows.map((row) => row.textContent)).toEqual(['Show key'])
  })
})

describe('FilterPill', () => {
  test('says what is highlighted and clears it', async () => {
    const user = userEvent.setup()
    const onClear = vi.fn()
    render(<FilterPill filter="notes" onClear={onClear} />)

    expect(screen.getByText('Notes highlighted')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  test('shows nothing without a filter', () => {
    const { container } = render(<FilterPill filter={null} onClear={vi.fn()} />)

    expect(container).toBeEmptyDOMElement()
  })
})
