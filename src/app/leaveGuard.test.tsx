import { render } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { canLeavePage, useLeaveGuard } from './leaveGuard'

function Guarded({ path, canLeave }: { path: string; canLeave: () => boolean }) {
  useLeaveGuard(path, canLeave)
  return null
}

afterEach(() => vi.restoreAllMocks())

describe('leaveGuard', () => {
  test('a page without a guard can be left', () => {
    expect(canLeavePage('/today')).toBe(true)
  })

  test('asks only the guard of the page being left', () => {
    const today = vi.fn(() => false)
    const history = vi.fn(() => true)
    render(
      <>
        <Guarded path="/today/note" canLeave={today} />
        <Guarded path="/history/note" canLeave={history} />
      </>,
    )

    expect(canLeavePage('/history/note')).toBe(true)
    expect(today).not.toHaveBeenCalled()
    expect(canLeavePage('/today/note')).toBe(false)
    expect(canLeavePage('/history')).toBe(true)
  })

  test('two guards do not overwrite each other', () => {
    render(
      <>
        <Guarded path="/a" canLeave={() => false} />
        <Guarded path="/b" canLeave={() => false} />
      </>,
    )

    expect(canLeavePage('/a')).toBe(false)
    expect(canLeavePage('/b')).toBe(false)
  })

  test('uses the latest function without registering again', () => {
    const view = render(<Guarded path="/a" canLeave={() => false} />)
    view.rerender(<Guarded path="/a" canLeave={() => true} />)

    expect(canLeavePage('/a')).toBe(true)
  })

  test('is gone once the page unmounts', () => {
    const view = render(<Guarded path="/a" canLeave={() => false} />)
    view.unmount()

    expect(canLeavePage('/a')).toBe(true)
  })

  test('a guard that throws lets the page go and is logged', () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <Guarded
        path="/a"
        canLeave={() => {
          throw new Error('boom')
        }}
      />,
    )

    expect(canLeavePage('/a')).toBe(true)
    expect(logged).toHaveBeenCalled()
  })
})
