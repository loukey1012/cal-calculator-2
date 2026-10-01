import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { TabBar } from './TabBar'

const ITEMS = [
  { id: 'today', label: 'Today', icon: <svg /> },
  { id: 'history', label: 'History', icon: <svg /> },
]

describe('TabBar', () => {
  test('marks the active tab as the current page', () => {
    render(<TabBar items={ITEMS} activeIndex={1} onSelect={vi.fn()} onReselect={vi.fn()} />)

    expect(screen.getByRole('navigation', { name: 'Tabs' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'History' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Today' })).not.toHaveAttribute('aria-current')
  })

  test('selecting another tab reports its index', async () => {
    const onSelect = vi.fn()
    const onReselect = vi.fn()
    render(<TabBar items={ITEMS} activeIndex={1} onSelect={onSelect} onReselect={onReselect} />)

    await userEvent.click(screen.getByRole('button', { name: 'Today' }))

    expect(onSelect).toHaveBeenCalledWith(0)
    expect(onReselect).not.toHaveBeenCalled()
  })

  test('tapping the active tab again reports a reselect (scroll to top)', async () => {
    const onSelect = vi.fn()
    const onReselect = vi.fn()
    render(<TabBar items={ITEMS} activeIndex={1} onSelect={onSelect} onReselect={onReselect} />)

    await userEvent.click(screen.getByRole('button', { name: 'History' }))

    expect(onReselect).toHaveBeenCalledWith(1)
    expect(onSelect).not.toHaveBeenCalled()
  })
})
