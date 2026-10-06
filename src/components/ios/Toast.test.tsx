import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { Toast, TOAST_DURATION_MS } from './Toast'

afterEach(() => vi.useRealTimers())

describe('Toast', () => {
  test('shows its message as a status and calls onDone after a while', () => {
    // Arrange
    vi.useFakeTimers()
    const onDone = vi.fn()

    // Act
    render(<Toast message="Link copied." onDone={onDone} />)

    // Assert
    expect(screen.getByRole('status')).toHaveTextContent('Link copied.')
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS - 1))
    expect(onDone).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(onDone).toHaveBeenCalledOnce()
  })

  test('shows nothing without a message', () => {
    render(<Toast message={null} onDone={() => {}} />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
