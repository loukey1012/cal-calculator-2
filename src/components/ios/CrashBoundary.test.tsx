import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { CrashBoundary } from './CrashBoundary'

function Broken(): never {
  throw new Error('boom')
}

describe('CrashBoundary', () => {
  afterEach(() => vi.restoreAllMocks())

  test('shows its children while nothing goes wrong', () => {
    render(
      <CrashBoundary onReload={vi.fn()}>
        <p>Today</p>
      </CrashBoundary>,
    )

    expect(screen.getByText('Today')).toBeInTheDocument()
  })

  test('a page that crashes shows a message with Reload instead of a black screen', async () => {
    // Arrange: React reports the error to the console; keep the test output clean
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const reload = vi.fn()
    const user = userEvent.setup()

    // Act
    render(
      <CrashBoundary onReload={reload}>
        <Broken />
      </CrashBoundary>,
    )
    await user.click(screen.getByRole('button', { name: 'Reload' }))

    // Assert
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
    expect(reload).toHaveBeenCalledOnce()
  })
})
