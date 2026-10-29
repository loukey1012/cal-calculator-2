import { describe, expect, test } from 'vitest'
import css from '../../index.css?raw'

const sources = import.meta.glob<string>('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
})
const isTest = (path: string) => /\.test\.tsx?$/.test(path)
const defined = new Set([...css.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((match) => match[1]))

const COLOR_CLASS =
  /(?:^|[\s'"`:])(?:bg|text|border|ring|fill|stroke)-([a-z][a-z-]*?)(?:\/\d+)?(?=[\s'"`])/g
const NOT_TOKENS = new Set([
  'accent-soft', // an @utility in index.css
  'offset-bg-elevated', // ring-offset-bg-elevated: the offset color
  'inset', // text-inset and the like
  't', // a word in a template string

  'dashed',
  'solid',
  'center',
  'left',
  'right',
  'top',
  'bottom',
  'base',
  'xs',
  'sm',
  'lg',
  'xl',
  'transparent',
  'current',
  'inherit',
  'none',
  'clip',
  'ellipsis',
  'wrap',
  'nowrap',
  'balance',
  'start',
  'end',
  'justify',
  'offset',
  'collapse',
  'separate',
])

describe('calendar color classes', () => {
  test('every theme color used by the history files is defined in index.css', () => {
    const missing = Object.entries(sources)
      .filter(([path]) => path.startsWith('/src/features/history/') && !isTest(path))
      .flatMap(([path, source]) =>
        [...source.matchAll(COLOR_CLASS)]
          .map((match) => match[1] ?? '')
          .filter((token) => !defined.has(token) && !NOT_TOKENS.has(token))
          .map((token) => `${path}: ${token}`),
      )

    expect(missing).toEqual([])
  })

  test('the removed star token is not used anywhere', () => {
    expect(defined.has('star')).toBe(false)
    const users = Object.entries(sources)
      .filter(([path, source]) => !isTest(path) && /[\s'"`](?:bg|text|border)-star\b/.test(source))
      .map(([path]) => path)
    expect(users).toEqual([])
  })
})
