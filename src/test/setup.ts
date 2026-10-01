import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Vitest runs without globals, so Testing Library can't register its auto-cleanup
afterEach(() => cleanup())

// jsdom lacks browser APIs that Embla (tab swiping) and pointer gestures rely on
class NoopObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): [] {
    return []
  }
}

if (!('ResizeObserver' in window)) {
  Object.assign(window, { ResizeObserver: NoopObserver })
}
if (!('IntersectionObserver' in window)) {
  Object.assign(window, { IntersectionObserver: NoopObserver })
}
if (!window.matchMedia) {
  Object.assign(window, {
    matchMedia: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}
if (!('PointerEvent' in window)) {
  class PointerEventPolyfill extends MouseEvent {
    readonly pointerId: number
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init)
      this.pointerId = init.pointerId ?? 1
    }
  }
  Object.assign(window, { PointerEvent: PointerEventPolyfill })
}

// unit tests must never reach a real backend (.env.local points at production);
// React Query would swallow the rejection, so the test fails afterwards instead
const unmockedRequests: string[] = []
window.fetch = (input: RequestInfo | URL) => {
  unmockedRequests.push(String(input))
  return Promise.reject(new Error(`Unmocked network request in a unit test: ${String(input)}`))
}
afterEach(() => {
  const requests = unmockedRequests.splice(0)
  if (requests.length === 0) return
  cleanup() // keep later tests isolated even though this one fails
  throw new Error(`Unmocked network requests:\n${requests.join('\n')}`)
})
