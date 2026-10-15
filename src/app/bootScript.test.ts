import { afterEach, describe, expect, test } from 'vitest'
import html from '../../index.html?raw'
import { APPEARANCE_CACHE_KEY } from '../lib/persistence'

// the inline script in index.html that paints the cached look before the app has loaded
const bootScript = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1] ?? ''

function boot(cache: object | null): string | undefined {
  if (cache) localStorage.setItem(APPEARANCE_CACHE_KEY, JSON.stringify(cache))
  new Function(bootScript)()
  return document.documentElement.dataset.scheme
}

afterEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.scheme
  delete document.documentElement.dataset.glass
  delete document.documentElement.dataset.accentEdge
})

describe('index.html boot script, Liquid Glass', () => {
  test.each([
    ['controls', 'controls'],
    ['all', 'all'],
    ['off', undefined],
    ['shiny', undefined],
    [undefined, undefined],
  ])('starts with the cached glass %s', (glass, applied) => {
    boot({ theme: 'light', glass, variables: {} })

    expect(document.documentElement.dataset.glass).toBe(applied)
  })
})

describe('index.html boot script', () => {
  test('starts light without a cached look (jsdom prefers light)', () => {
    expect(boot(null)).toBe('light')
  })

  test.each([
    [{ theme: 'dark', darkStyle: 'bento' }, 'bento'],
    [{ theme: 'light', lightStyle: 'pink' }, 'pink'],
    [{ theme: 'system', lightStyle: 'pink', darkStyle: 'soft' }, 'pink'],
    [{ theme: 'light', lightStyle: 'sepia' }, 'light'],
  ])('paints %j as %s', (cache, scheme) => {
    expect(boot({ ...cache, variables: {} })).toBe(scheme)
  })
})

describe('index.html boot script, accent on light styles', () => {
  test.each([
    [{ theme: 'light', accentOnLight: 'edge' }, 'on'],
    [{ theme: 'dark', accentOnLight: 'edge' }, undefined],
    [{ theme: 'light', accentOnLight: 'darker' }, undefined],
  ])('%j marks the accent edge: %s', (cache, edge) => {
    boot({ ...cache, variables: {} })

    expect(document.documentElement.dataset.accentEdge).toBe(edge)
  })
})
