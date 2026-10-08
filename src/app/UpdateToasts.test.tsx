import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { createUpdateReady } from './updateReady'
import { UpdateToasts } from './UpdateToasts'

afterEach(() => vi.useRealTimers())

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
  act(() => document.dispatchEvent(new Event('visibilitychange')))
}

describe('UpdateToasts', () => {
  test('the first start on a new version shows a toast', () => {
    render(<UpdateToasts updatedThisStart update={createUpdateReady()} />)

    expect(screen.getByRole('status')).toHaveTextContent('Updated to the latest version')
  })

  test('otherwise nothing shows', () => {
    render(<UpdateToasts updatedThisStart={false} update={createUpdateReady()} />)

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  test('a newer version waiting offers to update now', async () => {
    // Arrange
    const user = userEvent.setup()
    const update = createUpdateReady()
    const apply = vi.fn()
    render(<UpdateToasts updatedThisStart={false} update={update} />)

    // Act
    act(() => update.markReady(apply))

    // Assert
    expect(screen.getByRole('status')).toHaveTextContent('New version ready')
    await user.click(screen.getByRole('button', { name: 'Update' }))
    expect(apply).toHaveBeenCalledOnce()
  })

  test('the update offer comes back when the app returns to the foreground', () => {
    vi.useFakeTimers()
    const update = createUpdateReady()
    update.markReady(vi.fn())
    render(<UpdateToasts updatedThisStart={false} update={update} />)
    expect(screen.getByRole('status')).toHaveTextContent('New version ready')
    act(() => vi.advanceTimersByTime(60_000))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    setVisibility('hidden')
    setVisibility('visible')

    expect(screen.getByRole('status')).toHaveTextContent('New version ready')
  })
})
