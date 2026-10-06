import { afterEach, describe, expect, test, vi } from 'vitest'
import { confirmDeleteDish } from './confirmDelete'

afterEach(() => vi.restoreAllMocks())

describe('confirmDeleteDish', () => {
  test('a dish with one portion is deleted without asking', () => {
    const confirm = vi.spyOn(window, 'confirm')

    expect(confirmDeleteDish(1)).toBe(true)
    expect(confirm).not.toHaveBeenCalled()
  })

  test.each([true, false])('a dish with more portions asks first (answer %s)', (answer) => {
    vi.spyOn(window, 'confirm').mockReturnValue(answer)

    expect(confirmDeleteDish(3)).toBe(answer)
  })

  test('a dish with unknown portions asks to be safe', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)

    expect(confirmDeleteDish(undefined)).toBe(false)
    expect(confirm).toHaveBeenCalledOnce()
  })
})
