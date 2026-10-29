import { afterEach, describe, expect, test, vi } from 'vitest'
import { clearNoteDraft, readNoteDraft, writeNoteDraft } from './noteDraft'

afterEach(() => {
  vi.restoreAllMocks()
  sessionStorage.clear()
})

describe('noteDraft', () => {
  test('keeps a draft per address', () => {
    writeNoteDraft('/today/a', { text: 'one', base: '' })
    writeNoteDraft('/today/b', { text: 'two', base: 'x' })

    expect(readNoteDraft('/today/a')).toEqual({ text: 'one', base: '' })
    expect(readNoteDraft('/today/b')).toEqual({ text: 'two', base: 'x' })
  })

  test('clearing removes only that draft', () => {
    writeNoteDraft('/a', { text: 'one', base: '' })
    writeNoteDraft('/b', { text: 'two', base: '' })
    clearNoteDraft('/a')

    expect(readNoteDraft('/a')).toBeNull()
    expect(readNoteDraft('/b')).not.toBeNull()
  })

  test('ignores stored values of another shape', () => {
    sessionStorage.setItem('note-draft:/a', '{"text":5}')
    sessionStorage.setItem('note-draft:/b', 'not json')

    expect(readNoteDraft('/a')).toBeNull()
    expect(readNoteDraft('/b')).toBeNull()
  })

  test('blocked storage never throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked')
    })

    expect(() => writeNoteDraft('/a', { text: 'x', base: '' })).not.toThrow()
    expect(readNoteDraft('/a')).toBeNull()
    expect(() => clearNoteDraft('/a')).not.toThrow()
  })
})
