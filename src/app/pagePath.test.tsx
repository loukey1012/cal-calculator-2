import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, test } from 'vitest'
import { PagePathContext, useIsPageShown } from './pagePath'

function shownAt(address: string, pagePath: string | null) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[address]}>
      <PagePathContext value={pagePath}>{children}</PagePathContext>
    </MemoryRouter>
  )
  return renderHook(() => useIsPageShown(), { wrapper }).result.current
}

describe('useIsPageShown', () => {
  test('is true for a page shown for the address, or outside a page stack', () => {
    expect(shownAt('/history', '/history')).toBe(true)
    expect(shownAt('/history', null)).toBe(true)
  })

  test('is false for another tab, and for the page below one on top', () => {
    expect(shownAt('/today', '/history')).toBe(false)
    expect(shownAt('/history/meal-lunch-2026-10-03-u1', '/history')).toBe(false)
  })
})
