import { describe, expect, test } from 'vitest'
import { formatVersion, recordVersion, VERSION_STORAGE_KEY } from './appVersion'

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(initial))
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
    clear: () => values.clear(),
    key: () => null,
    get length() {
      return values.size
    },
  }
}

describe('recordVersion', () => {
  test('the first start on a new version says so, and remembers it', () => {
    const storage = memoryStorage({ [VERSION_STORAGE_KEY]: 'aaa1111' })

    expect(recordVersion(storage, 'bbb2222')).toBe(true)
    expect(storage.getItem(VERSION_STORAGE_KEY)).toBe('bbb2222')
  })

  test('the next start on the same version says nothing', () => {
    const storage = memoryStorage({ [VERSION_STORAGE_KEY]: 'aaa1111' })
    recordVersion(storage, 'bbb2222')

    expect(recordVersion(storage, 'bbb2222')).toBe(false)
  })

  test('a first install or a new phone says nothing, but remembers the version', () => {
    const storage = memoryStorage()

    expect(recordVersion(storage, 'bbb2222')).toBe(false)
    expect(storage.getItem(VERSION_STORAGE_KEY)).toBe('bbb2222')
  })

  test('without usable storage (e.g. private mode) it says nothing', () => {
    const storage = {
      ...memoryStorage(),
      getItem: () => {
        throw new Error('blocked')
      },
    }

    expect(recordVersion(storage, 'bbb2222')).toBe(false)
  })
})

describe('formatVersion', () => {
  test('build day and short commit', () => {
    expect(formatVersion({ id: '9a26e06f00', builtAt: '2026-10-08T06:40:00.000Z' }, 'en-GB')).toBe(
      '8 Oct 2026 · 9a26e06',
    )
  })
})
