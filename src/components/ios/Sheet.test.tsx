import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { Sheet } from './Sheet'

function renderSheet(open = true) {
  const onClose = vi.fn()
  const result = render(
    <Sheet open={open} onClose={onClose} title="Lunch">
      <p>Sheet content</p>
    </Sheet>,
  )
  return { ...result, onClose }
}

describe('Sheet', () => {
  test('renders nothing while closed', () => {
    renderSheet(false)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('renders a labelled modal dialog above the page and locks page scrolling', () => {
    const { unmount } = renderSheet()

    expect(screen.getByRole('dialog', { name: 'Lunch' })).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByText('Sheet content')).toBeInTheDocument()
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('')
  })

  test.each([
    ['the Close button', () => userEvent.click(screen.getByRole('button', { name: 'Close' }))],
    ['the backdrop', () => userEvent.click(screen.getByTestId('sheet-backdrop'))],
    ['Escape', () => userEvent.keyboard('{Escape}')],
  ])('closes via %s', async (_name, act) => {
    const { onClose } = renderSheet()

    await act()

    expect(onClose).toHaveBeenCalled()
  })

  test('closes when dragged down far enough by its grabber', () => {
    const { onClose } = renderSheet()
    const handle = screen.getByTestId('sheet-drag-handle')

    fireEvent.pointerDown(handle, { clientY: 100 })
    fireEvent.pointerMove(handle, { clientY: 300 })
    fireEvent.pointerUp(handle, { clientY: 300 })

    expect(onClose).toHaveBeenCalled()
  })

  test('snaps back after a short drag', () => {
    const { onClose } = renderSheet()
    const handle = screen.getByTestId('sheet-drag-handle')

    fireEvent.pointerDown(handle, { clientY: 100 })
    fireEvent.pointerMove(handle, { clientY: 140 })
    fireEvent.pointerUp(handle, { clientY: 140 })

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog').style.transform).toBe('')
  })

  test('a press on the Close button does not start a drag (so the tap still clicks on iOS)', () => {
    renderSheet()
    const original = Element.prototype.setPointerCapture
    const capture = vi.fn()
    Element.prototype.setPointerCapture = capture

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Close' }), { clientY: 100 })

    Element.prototype.setPointerCapture = original
    expect(capture).not.toHaveBeenCalled()
  })

  test('makes the app behind it inert and gives focus back when it closes', () => {
    const appRoot = document.createElement('div')
    appRoot.id = 'root'
    const trigger = document.createElement('button')
    appRoot.append(trigger)
    document.body.append(appRoot)
    trigger.focus()

    const { unmount } = renderSheet()

    expect(appRoot).toHaveAttribute('inert')
    expect(screen.getByRole('dialog')).toHaveFocus()
    unmount()
    expect(appRoot).not.toHaveAttribute('inert')
    expect(trigger).toHaveFocus()
    appRoot.remove()
  })
})
