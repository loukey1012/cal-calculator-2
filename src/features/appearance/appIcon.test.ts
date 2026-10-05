import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { APP_ICONS } from './appearance'
import { applyAppIcon, appIconFiles } from './appIcon'

// every icon file shipped in public/, as /public/icons/<name>/<file>
const shippedFiles = Object.keys(import.meta.glob('/public/icons/*/*.{png,svg}'))

describe('appIconFiles', () => {
  test('points at the icon’s own folder', () => {
    expect(appIconFiles('pink')).toEqual({
      touchIcon: '/icons/pink/apple-touch-icon-180x180.png',
      svg: '/icons/pink/icon.svg',
    })
  })

  test.each(APP_ICONS)('ships the %s icon files', (icon) => {
    const { touchIcon, svg } = appIconFiles(icon)

    expect(shippedFiles).toContain(`/public${touchIcon}`)
    expect(shippedFiles).toContain(`/public${svg}`)
  })

  test('offers every C icon except the macro one, Graphite first', () => {
    expect(APP_ICONS).toEqual([
      'graphite',
      'classic',
      'pink',
      'sunset',
      'progress',
      'ember',
      'leaf',
      'violet',
    ])
  })
})

describe('applyAppIcon', () => {
  beforeEach(() => {
    document.head.innerHTML = `
      <link rel="icon" href="/favicon.ico" sizes="48x48" />
      <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      <link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />`
  })

  afterEach(() => {
    document.head.innerHTML = ''
  })

  test('swaps the home-screen and browser-tab icons', () => {
    applyAppIcon('ember')

    expect(document.querySelector('link[rel="apple-touch-icon"]')).toHaveAttribute(
      'href',
      '/icons/ember/apple-touch-icon-180x180.png',
    )
    expect(document.querySelector('link[type="image/svg+xml"]')).toHaveAttribute(
      'href',
      '/icons/ember/icon.svg',
    )
    expect(document.querySelector('link[sizes="48x48"]')).toHaveAttribute('href', '/favicon.ico')
  })

  test('does nothing on a page without icon links', () => {
    document.head.innerHTML = ''

    expect(() => applyAppIcon('leaf')).not.toThrow()
  })
})
