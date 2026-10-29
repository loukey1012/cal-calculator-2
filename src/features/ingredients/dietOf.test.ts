import { describe, expect, test } from 'vitest'
import { dietOf } from './dietOf'
import { ingredient } from './testData'

const OATS = ingredient({ id: 'oats', vegan: true, halal: true })
const TOFU = ingredient({ id: 'tofu', vegan: true })
const SALAMI = ingredient({ id: 'salami' })
const BY_ID = new Map([OATS, TOFU, SALAMI].map((item) => [item.id, item]))

describe('dietOf', () => {
  test('a mark only when every ingredient has it', () => {
    expect(dietOf(['oats', 'tofu'], BY_ID)).toEqual({ vegan: true, halal: false })
    expect(dietOf(['oats'], BY_ID)).toEqual({ vegan: true, halal: true })
    expect(dietOf(['oats', 'salami'], BY_ID)).toEqual({ vegan: false, halal: false })
  })

  test('nothing in it, an unknown ingredient or a custom item (null) means no mark', () => {
    expect(dietOf([], BY_ID)).toEqual({ vegan: false, halal: false })
    expect(dietOf(['oats', 'gone'], BY_ID)).toEqual({ vegan: false, halal: false })
    expect(dietOf(['oats', null], BY_ID)).toEqual({ vegan: false, halal: false })
  })

  test('the same ingredient twice still counts once', () => {
    expect(dietOf(['tofu', 'tofu'], BY_ID)).toEqual({ vegan: true, halal: false })
  })
})
