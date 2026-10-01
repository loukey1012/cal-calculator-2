import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { SwipeableRow } from './SwipeableRow'

function renderRow() {
  const onDelete = vi.fn()
  render(
    <SwipeableRow onDelete={onDelete}>
      <span>Cream 150 g</span>
    </SwipeableRow>,
  )
  const row = screen.getByTestId('swipeable-row')
  return { onDelete, row }
}

function swipe(row: HTMLElement, fromX: number, toX: number) {
  fireEvent.pointerDown(row, { clientX: fromX, clientY: 10 })
  fireEvent.pointerMove(row, { clientX: toX, clientY: 10 })
  fireEvent.pointerUp(row, { clientX: toX, clientY: 10 })
}

describe('SwipeableRow', () => {
  test('locks tab swiping for gestures that start on it', () => {
    const { row } = renderRow()

    expect(row).toHaveAttribute('data-swipe-lock')
  })

  test('a left swipe reveals the delete action', () => {
    const { row } = renderRow()

    swipe(row, 300, 200)

    expect(row).toHaveAttribute('data-state', 'open')
  })

  test('a short swipe snaps back closed', () => {
    const { row } = renderRow()

    swipe(row, 300, 280)

    expect(row).toHaveAttribute('data-state', 'closed')
  })

  test('a right swipe closes an open row', () => {
    const { row } = renderRow()

    swipe(row, 300, 200)
    swipe(row, 200, 300)

    expect(row).toHaveAttribute('data-state', 'closed')
  })

  test('the delete button deletes', async () => {
    const { onDelete } = renderRow()

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onDelete).toHaveBeenCalled()
  })

  test('focusing the delete button with the keyboard reveals it', () => {
    const { row } = renderRow()

    fireEvent.focus(screen.getByRole('button', { name: 'Delete' }))

    expect(row).toHaveAttribute('data-state', 'open')
  })

  test('ignores tiny finger jitter', () => {
    const { row } = renderRow()

    fireEvent.pointerDown(row, { clientX: 300, clientY: 10 })
    fireEvent.pointerMove(row, { clientX: 297, clientY: 10 })

    expect(screen.getByText('Cream 150 g').parentElement?.style.transform).toBe('translateX(0px)')
  })

  test('a drag does not also click the row content', () => {
    const onContentClick = vi.fn()
    render(
      <SwipeableRow onDelete={vi.fn()}>
        <button type="button" onClick={onContentClick}>
          Content
        </button>
      </SwipeableRow>,
    )
    const row = screen.getAllByTestId('swipeable-row').at(-1) as HTMLElement

    swipe(row, 300, 200)
    fireEvent.click(screen.getByRole('button', { name: 'Content' }))
    fireEvent.click(screen.getByRole('button', { name: 'Content' }))

    expect(onContentClick).toHaveBeenCalledTimes(1)
  })
})
