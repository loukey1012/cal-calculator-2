import { describe, expect, test } from 'vitest'
import { toCsv } from './csv'

describe('toCsv', () => {
  test('semicolons between fields, decimal commas, one line per row, opened as UTF-8', () => {
    const csv = toCsv(
      ['Food', 'kcal', 'Fat (g)'],
      [
        ['Butter', 740, 81.11],
        ['Käse', 350, null],
      ],
    )

    expect(csv).toBe('﻿Food;kcal;Fat (g)\r\nButter;740;81,11\r\nKäse;350;\r\n')
  })

  test('text with a semicolon, quote or line break is quoted, quotes doubled', () => {
    const csv = toCsv(['Food'], [['Pasta; Pesto'], ['He said "yes"'], ['two\nlines']])

    expect(csv.split('\r\n').slice(1, 4)).toEqual([
      '"Pasta; Pesto"',
      '"He said ""yes"""',
      '"two\nlines"',
    ])
  })

  test('true and false read as yes and nothing', () => {
    expect(toCsv(['Estimate'], [[true], [false]])).toBe('﻿Estimate\r\nyes\r\n\r\n')
  })

  test('a text that looks like a formula is kept as text', () => {
    expect(toCsv(['Food'], [['=SUM(A1)']]).split('\r\n')[1]).toBe("'=SUM(A1)")
  })
})
