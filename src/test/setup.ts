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
