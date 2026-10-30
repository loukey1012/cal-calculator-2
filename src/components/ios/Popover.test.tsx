import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { Popover } from './Popover'

function Harness({ open, onClose }: { readonly open: boolean; readonly onClose: () => void }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  return (
    <div>
      <button ref={setAnchor}>Anchor</button>
      <p>Elsewhere</p>
      <button>Other</button>
      <Popover open={open} anchor={anchor} label="Choices" onClose={onClose}>
        <button>First</button>
        <button>Second</button>
      </Popover>
    </div>
  )
}

describe('Popover', () => {
  test('renders nothing when closed', () => {
    render(<Harness open={false} onClose={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('is a labelled dialog in the body when open', () => {
    render(<Harness open onClose={vi.fn()} />)
    const dialog = screen.getByRole('dialog', { name: 'Choices' })
    expect(dialog.parentElement).toBe(document.body)
  })

  test('moves the focus to the first button when it opens', () => {
    render(<Harness open onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus()
  })

  test('closes on Escape', async () => {
    const onClose = vi.fn()
    render(<Harness open onClose={onClose} />)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  test('closes on a pointerdown outside', async () => {
    const onClose = vi.fn()
    render(<Harness open onClose={onClose} />)
    await userEvent.pointer({ keys: '[MouseLeft>]', target: screen.getByText('Elsewhere') })
    expect(onClose).toHaveBeenCalledOnce()
  })

  test('stays open on a pointerdown inside or on the anchor', async () => {
    const onClose = vi.fn()
    render(<Harness open onClose={onClose} />)
    await userEvent.pointer({
      keys: '[MouseLeft>]',
      target: screen.getByRole('button', { name: 'Second' }),
    })
    await userEvent.pointer({
      keys: '[MouseLeft>]',
      target: screen.getByRole('button', { name: 'Anchor' }),
    })
    expect(onClose).not.toHaveBeenCalled()
  })

  test('returns the focus to the anchor when it closes', () => {
    const { rerender } = render(<Harness open onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus()
    rerender(<Harness open={false} onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Anchor' })).toHaveFocus()
  })

  test('does not take the focus back when the user moved it elsewhere', () => {
    const { rerender } = render(<Harness open onClose={vi.fn()} />)
    screen.getByRole('button', { name: 'Other' }).focus()
    rerender(<Harness open={false} onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Other' })).toHaveFocus()
  })

  test('Tab inside closes it and puts the focus on the anchor', async () => {
    const onClose = vi.fn()
    render(<Harness open onClose={onClose} />)
    await userEvent.tab()
    expect(onClose).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Anchor' })).toHaveFocus()
  })

  test('Shift+Tab inside closes it and puts the focus on the anchor', async () => {
    const onClose = vi.fn()
    render(<Harness open onClose={onClose} />)
    await userEvent.tab({ shift: true })
    expect(onClose).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Anchor' })).toHaveFocus()
  })
})
