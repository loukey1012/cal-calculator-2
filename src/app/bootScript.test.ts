import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, test } from 'vitest'
import { APPEARANCE_CACHE_KEY } from '../lib/persistence'

// the inline script in index.html that paints the cached look before the app has loaded
const html = readFileSync('index.html', 'utf8')
const bootScript = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1] ?? ''

function boot(cache: object | null): string | undefined {
  if (cache) localStorage.setItem(APPEARANCE_CACHE_KEY, JSON.stringify(cache))
  new Function(bootScript)()
  return document.documentElement.dataset.scheme
}

afterEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.scheme
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
