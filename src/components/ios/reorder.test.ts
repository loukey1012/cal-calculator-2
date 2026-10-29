import { describe, expect, test } from 'vitest'
import { moveItem, targetIndex } from './reorder'

describe('moveItem', () => {
  test('moves an item later and returns a new array', () => {
    const list = ['a', 'b', 'c', 'd']
    expect(moveItem(list, 0, 2)).toEqual(['b', 'c', 'a', 'd'])
    expect(list).toEqual(['a', 'b', 'c', 'd'])
  })

  test('moves an item earlier', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c'])
  })

  test('returns a copy when nothing moves', () => {
    const list = ['a', 'b']
    const same = moveItem(list, 1, 1)
    expect(same).toEqual(['a', 'b'])
    expect(same).not.toBe(list)
  })

  test('clamps the target and ignores an unknown source', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 9)).toEqual(['b', 'c', 'a'])
    expect(moveItem(['a', 'b', 'c'], 2, -4)).toEqual(['c', 'a', 'b'])
    expect(moveItem(['a', 'b'], 5, 0)).toEqual(['a', 'b'])
  })

  test('leaves a single item and an empty list alone', () => {
    expect(moveItem(['a'], 0, 3)).toEqual(['a'])
    expect(moveItem([], 0, 0)).toEqual([])
  })

  test('ignores a source or target that is not a whole number', () => {
    expect(moveItem(['a', 'b'], Number.NaN, 0)).toEqual(['a', 'b'])
    expect(moveItem(['a', 'b'], 0.5, 1)).toEqual(['a', 'b'])
    expect(moveItem(['a', 'b'], 0, Number.NaN)).toEqual(['a', 'b'])
  })
})

describe('targetIndex', () => {
  test('stays put until the row is dragged over half a row', () => {
    expect(targetIndex(2, 20, 48, 5)).toBe(2)
    expect(targetIndex(2, 25, 48, 5)).toBe(3)
    expect(targetIndex(2, -25, 48, 5)).toBe(1)
  })

  test('follows several rows', () => {
    expect(targetIndex(0, 100, 48, 5)).toBe(2)
  })

  test('is clamped to the list', () => {
    expect(targetIndex(1, 9999, 48, 5)).toBe(4)
    expect(targetIndex(3, -9999, 48, 5)).toBe(0)
  })

  test('stays put for a row height of zero', () => {
    expect(targetIndex(2, 80, 0, 5)).toBe(2)
  })

  test('stays put for a row height that is NaN or negative, or an empty list', () => {
    expect(targetIndex(2, 80, Number.NaN, 5)).toBe(2)
    expect(targetIndex(2, 80, -48, 5)).toBe(2)
    expect(targetIndex(0, 80, 48, 0)).toBe(0)
  })

  test('stays put for an offset that is NaN, and for a single item', () => {
    expect(targetIndex(2, Number.NaN, 48, 5)).toBe(2)
    expect(targetIndex(0, 500, 48, 1)).toBe(0)
  })
})
