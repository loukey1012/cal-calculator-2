import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { ReorderList } from './ReorderList'

const ROW_HEIGHT = 50

type Item = { readonly id: string; readonly name: string }
const ITEMS: readonly Item[] = [
  { id: 'a', name: 'Alpha' },
  { id: 'b', name: 'Beta' },
  { id: 'c', name: 'Gamma' },
]

function Harness({ onReorder }: { readonly onReorder: (next: readonly Item[]) => void }) {
  const [items, setItems] = useState(ITEMS)
  return (
    <ReorderList
      items={items}
      getKey={(item) => item.id}
      getLabel={(item) => item.name}
      renderRow={(item) => <span>{item.name}</span>}
      onReorder={(next) => {
        setItems(next)
        onReorder(next)
      }}
    />
  )
}

const names = () => screen.getAllByRole('listitem').map((row) => row.firstElementChild?.textContent)

afterEach(() => vi.restoreAllMocks())

function drag(handle: HTMLElement, ...moves: number[]) {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    height: ROW_HEIGHT,
  } as DOMRect)
  fireEvent.pointerDown(handle, { pointerId: 1, clientY: 100, button: 0 })
  for (const move of moves) fireEvent.pointerMove(handle, { pointerId: 1, clientY: 100 + move })
}

describe('ReorderList with the keyboard', () => {
  test('ArrowDown on a handle moves its row down and says where it went', async () => {
    const user = userEvent.setup()
    const onReorder = vi.fn()
    render(<Harness onReorder={onReorder} />)

    screen.getByRole('button', { name: 'Move Alpha' }).focus()
    await user.keyboard('{ArrowDown}')

    expect(names()).toEqual(['Beta', 'Alpha', 'Gamma'])
    expect(onReorder).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('status')).toHaveTextContent('Alpha moved to position 2 of 3')
    expect(screen.getByRole('button', { name: 'Move Alpha' })).toHaveFocus()
  })

  test('ArrowUp moves a row up', async () => {
    const user = userEvent.setup()
    render(<Harness onReorder={vi.fn()} />)

    screen.getByRole('button', { name: 'Move Gamma' }).focus()
    await user.keyboard('{ArrowUp}')

    expect(names()).toEqual(['Alpha', 'Gamma', 'Beta'])
  })

  test('the first row cannot move up and the last cannot move down', async () => {
    const user = userEvent.setup()
    const onReorder = vi.fn()
    render(<Harness onReorder={onReorder} />)

    screen.getByRole('button', { name: 'Move Alpha' }).focus()
    await user.keyboard('{ArrowUp}')
    screen.getByRole('button', { name: 'Move Gamma' }).focus()
    await user.keyboard('{ArrowDown}')

    expect(onReorder).not.toHaveBeenCalled()
  })

  test('a handle tells how to use it', () => {
    render(<Harness onReorder={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Move Alpha' })).toHaveAccessibleDescription(
      'Drag to move, or use the arrow keys.',
    )
  })
})

describe('ReorderList by dragging a handle', () => {
  test('commits the new order once, when let go', () => {
    const onReorder = vi.fn()
    render(<Harness onReorder={onReorder} />)
    const handle = screen.getByRole('button', { name: 'Move Alpha' })

    drag(handle, 30, 60, 110)
    expect(onReorder).not.toHaveBeenCalled()
    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 210 })

    expect(onReorder).toHaveBeenCalledTimes(1)
    expect(onReorder).toHaveBeenCalledWith([ITEMS[1], ITEMS[2], ITEMS[0]])
    expect(names()).toEqual(['Beta', 'Gamma', 'Alpha'])
  })

  test('the dragged row follows the finger and the rows in between make room', () => {
    render(<Harness onReorder={vi.fn()} />)
    const handle = screen.getByRole('button', { name: 'Move Alpha' })

    drag(handle, 60)

    const [first, second, third] = screen.getAllByRole('listitem')
    expect(first).toHaveStyle({ transform: 'translateY(60px)' })
    expect(second).toHaveStyle({ transform: `translateY(-${ROW_HEIGHT}px)` })
    expect(third?.style.transform).toBe('')
  })

  test('a drag past the end is held inside the list', () => {
    const onReorder = vi.fn()
    render(<Harness onReorder={onReorder} />)
    const handle = screen.getByRole('button', { name: 'Move Alpha' })

    drag(handle, 900)
    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 1000 })

    expect(names()).toEqual(['Beta', 'Gamma', 'Alpha'])
    expect(screen.getAllByRole('listitem')[2]?.style.transform).toBe('')
  })

  test('a drag that ends where it began commits nothing', () => {
    const onReorder = vi.fn()
    render(<Harness onReorder={onReorder} />)
    const handle = screen.getByRole('button', { name: 'Move Alpha' })

    drag(handle, 10)
    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 110 })

    expect(onReorder).not.toHaveBeenCalled()
    expect(names()).toEqual(['Alpha', 'Beta', 'Gamma'])
  })

  test('a cancelled drag restores the old order', () => {
    const onReorder = vi.fn()
    render(<Harness onReorder={onReorder} />)
    const handle = screen.getByRole('button', { name: 'Move Alpha' })

    drag(handle, 120)
    fireEvent.pointerCancel(handle, { pointerId: 1 })

    expect(onReorder).not.toHaveBeenCalled()
    expect(names()).toEqual(['Alpha', 'Beta', 'Gamma'])
    expect(screen.getAllByRole('listitem')[0]?.style.transform).toBe('')
  })

  test('only the handle starts a drag', () => {
    const onReorder = vi.fn()
    render(<Harness onReorder={onReorder} />)

    fireEvent.pointerDown(screen.getByText('Alpha'), { pointerId: 1, clientY: 100 })
    fireEvent.pointerMove(screen.getByText('Alpha'), { pointerId: 1, clientY: 400 })
    fireEvent.pointerUp(screen.getByText('Alpha'), { pointerId: 1, clientY: 400 })

    expect(onReorder).not.toHaveBeenCalled()
  })

  test('the handle locks the page swipes', () => {
    render(<Harness onReorder={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Move Alpha' })).toHaveAttribute('data-swipe-lock')
  })

  test('a second finger is ignored while one drags', () => {
    const onReorder = vi.fn()
    render(<Harness onReorder={onReorder} />)
    const handle = screen.getByRole('button', { name: 'Move Alpha' })
    const other = screen.getByRole('button', { name: 'Move Beta' })

    drag(handle, 60)
    fireEvent.pointerDown(other, { pointerId: 2, clientY: 150, button: 0 })
    fireEvent.pointerMove(handle, { pointerId: 2, clientY: 700 })
    fireEvent.pointerUp(handle, { pointerId: 2, clientY: 700 })

    expect(onReorder).not.toHaveBeenCalled()
    expect(screen.getAllByRole('listitem')[0]).toHaveStyle({ transform: 'translateY(60px)' })
    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 160 })
    expect(names()).toEqual(['Beta', 'Alpha', 'Gamma'])
  })

  test('losing the pointer capture ends the drag without a move', () => {
    const onReorder = vi.fn()
    render(<Harness onReorder={onReorder} />)
    const handle = screen.getByRole('button', { name: 'Move Alpha' })

    drag(handle, 120)
    fireEvent.lostPointerCapture(handle, { pointerId: 1 })

    expect(onReorder).not.toHaveBeenCalled()
    expect(names()).toEqual(['Alpha', 'Beta', 'Gamma'])
    expect(screen.getAllByRole('listitem')[0]?.style.transform).toBe('')
  })

  test('Escape cancels a drag', async () => {
    const user = userEvent.setup()
    const onReorder = vi.fn()
    render(<Harness onReorder={onReorder} />)
    const handle = screen.getByRole('button', { name: 'Move Alpha' })

    drag(handle, 120)
    handle.focus()
    await user.keyboard('{Escape}')
    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 220 })

    expect(onReorder).not.toHaveBeenCalled()
    expect(names()).toEqual(['Alpha', 'Beta', 'Gamma'])
  })

  test('shows the new order at once on drop, before the parent has passed it back', () => {
    render(
      <ReorderList
        items={ITEMS}
        getKey={(item) => item.id}
        getLabel={(item) => item.name}
        renderRow={(item) => <span>{item.name}</span>}
        onReorder={vi.fn()}
      />,
    )
    const handle = screen.getByRole('button', { name: 'Move Alpha' })

    drag(handle, 60)
    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 160 })

    expect(names()).toEqual(['Beta', 'Alpha', 'Gamma'])
    for (const row of screen.getAllByRole('listitem')) expect(row.style.transform).toBe('')
    expect(screen.getAllByRole('listitem')[0]?.className).not.toContain('transition-transform')
  })
})

describe('ReorderList for screen readers', () => {
  test('has buttons to move a row up or down, except past the ends', () => {
    render(<Harness onReorder={vi.fn()} />)

    expect(screen.queryByRole('button', { name: 'Move Alpha up' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Move Alpha down' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Move Gamma up' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Move Gamma down' })).not.toBeInTheDocument()
  })

  test('the move buttons reorder and announce the result', async () => {
    const user = userEvent.setup()
    render(<Harness onReorder={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Move Beta up' }))

    expect(names()).toEqual(['Beta', 'Alpha', 'Gamma'])
    expect(screen.getByRole('status')).toHaveTextContent('Beta moved to position 1 of 3')
  })

  test('hint and status sit outside the list', () => {
    render(<Harness onReorder={vi.fn()} />)

    const list = screen.getByRole('list')
    expect(list).not.toContainElement(screen.getByRole('status'))
    expect(list).not.toContainElement(screen.getByText('Drag to move, or use the arrow keys.'))
  })
})
