import { describe, expect, test } from 'vitest'
import { bestReading, parseNutritionLabel } from './labelParser'

const GERMAN = `
Nährwerte pro 100 g pro Portion (30 g) %RM*
Energie 1520 kJ / 363 kcal 456 kJ / 109 kcal 5 %
Fett 9,8 g 2,9 g 4 %
davon gesättigte Fettsäuren 1,2 g 0,4 g 2 %
Kohlenhydrate 58 g 17 g 7 %
davon Zucker 21 g 6,3 g 7 %
Ballaststoffe 6,5 g 2,0 g
Eiweiß 8,4 g 2,5 g 5 %
Salz 0,48 g 0,14 g 2 %
`

const ENGLISH = `
NUTRITION INFORMATION
Typical values Per 100ml
Energy 180kJ/43kcal
Fat 0g
of which saturates 0g
Carbohydrate 10.6g
of which sugars 10.6g
Protein 0g
Salt 0.01g
`

describe('parseNutritionLabel', () => {
  test('a German label: the per-100 g column, decimal commas, "davon" rows', () => {
    expect(parseNutritionLabel(GERMAN)).toEqual({
      measure: 'g',
      values: {
        kcal: 363,
        fat: 9.8,
        sat_fat: 1.2,
        carbs: 58,
        sugar: 21,
        fiber: 6.5,
        protein: 8.4,
        salt: 0.48,
      },
      found: 8,
    })
  })

  test('an English label per 100 ml', () => {
    expect(parseNutritionLabel(ENGLISH)).toEqual({
      measure: 'ml',
      values: {
        kcal: 43,
        fat: 0,
        sat_fat: 0,
        carbs: 10.6,
        sugar: 10.6,
        fiber: null,
        protein: 0,
        salt: 0.01,
      },
      found: 7,
    })
  })

  test('only kJ: calories are worked out from them', () => {
    expect(parseNutritionLabel('Brennwert 1.520 kJ\nFett 3 g').values).toMatchObject({
      kcal: 363,
      fat: 3,
    })
  })

  test('the values on the line after the name', () => {
    const text = 'Brennwert\n2252 kJ\n539 kcal\nEiweiss\n6,3 g\nKohlenhydrate:\n57,5g'

    expect(parseNutritionLabel(text).values).toMatchObject({
      kcal: 539,
      protein: 6.3,
      carbs: 57.5,
    })
  })

  test('"less than", milligrams and a missing unit', () => {
    const text = 'Zucker <0,5 g\nSalz 250 mg\nBallaststoffe 3,1\nGesattigte Fettsauren 0,1 g'

    expect(parseNutritionLabel(text).values).toMatchObject({
      sugar: 0.5,
      salt: 0.25,
      fiber: 3.1,
      sat_fat: 0.1,
    })
  })

  test('a fat row never takes the saturates, and each nutrient is read once', () => {
    const text = 'davon gesättigte Fettsäuren 2 g\nFett 10 g\nFett 99 g'

    expect(parseNutritionLabel(text).values).toMatchObject({ fat: 10, sat_fat: 2 })
  })

  test('"g" read as a 9, as text recognition does: the 9 is dropped', () => {
    // what the recognition made of a real table: 9,8 g · 1,2 g · 58 g · 21 g · 6,5 g · 8,4 g
    const text =
      'Nährwerte pro 100 g\nEnergie 1520 kJ / 363 kcal\nFett 9,89\ndavon gesättigte Fettsäuren 129\nKohlenhydrate 589g\ndavon Zucker 219g\nBallaststoffe 6,59\nEiweiß 8,49\nSalz 0,48 g\n'

    expect(parseNutritionLabel(text).values).toEqual({
      kcal: 363,
      fat: 9.8,
      // the lost comma can't be told: the value warnings flag more saturates than fat
      sat_fat: 12,
      carbs: 58,
      sugar: 21,
      fiber: 6.5,
      protein: 8.4,
      salt: 0.48,
    })
  })

  test('always the first column (per 100 g), even when it lost its unit', () => {
    expect(parseNutritionLabel('Fett 9,89 2,9 g 4 %').values.fat).toBe(9.8)
    // a real 9 with its unit stays
    expect(parseNutritionLabel('Salz 0,49 g').values.salt).toBe(0.49)
  })

  test('an ingredients list and the "pro 100 g" header are never read as values', () => {
    // the whole package as read: ingredients mention sugar and salt, the table is garbled
    const text = [
      'Zutaten: Haferflocken 58 %, Weizenflocken, Zucker, Rosinen 9 %, Haselnüsse,',
      'Sonnenblumenöl, Honig, Salz. Kann Spuren von Erdnüssen enthalten.',
      'lagern.',
      '[Nährwerte | pro 100g]',
      '[Energie [16801 400 kcal',
    ].join('\n')

    expect(parseNutritionLabel(text).values).toMatchObject({ kcal: 400, sugar: null, salt: null })
  })

  test('letters read in place of digits next to numbers: l, I or | for 1, O for 0', () => {
    const text = 'Kohlenhydrate 6lg\nZucker 2I g\nSalz O,3 g\nEiweiB 1|,5 g'

    expect(parseNutritionLabel(text).values).toMatchObject({
      carbs: 61,
      sugar: 21,
      salt: 0.3,
      protein: 11.5,
    })
  })

  test('a table read column by column: the names first, then their values in the same order', () => {
    const text = [
      'Nährwerte',
      'Energie',
      'Fett',
      'davon gesättigte Fettsäuren',
      'Kohlenhydrate',
      'Eiweiß',
      'Salz',
      'pro 100 g',
      '1520 kJ / 363 kcal',
      '9,8 g',
      '1,2 g',
      '58 g',
      '8,4 g',
      '0,48 g',
    ].join('\n')

    expect(parseNutritionLabel(text)).toMatchObject({
      values: { kcal: 363, fat: 9.8, sat_fat: 1.2, carbs: 58, protein: 8.4, salt: 0.48 },
      found: 6,
    })
  })

  test('a name and its value on the next line is not mistaken for columns', () => {
    const text = 'Energie\n1520 kJ / 363 kcal\nFett\n9,8 g\nSalz\n0,48 g'

    expect(parseNutritionLabel(text).values).toMatchObject({ kcal: 363, fat: 9.8, salt: 0.48 })
  })

  test('text without a nutrition table finds nothing', () => {
    expect(parseNutritionLabel('Zutaten: Weizenmehl, Wasser, Hefe')).toEqual({
      measure: 'g',
      values: {
        kcal: null,
        fat: null,
        sat_fat: null,
        carbs: null,
        sugar: null,
        fiber: null,
        protein: null,
        salt: null,
      },
      found: 0,
    })
  })
})

describe('bestReading', () => {
  test('the reading with the most values; on a tie the first (the cut-out table)', () => {
    const table = 'Fett 9,8 g\nEiweiß 8,4 g'
    const wholePhoto = 'Fett 98 g\nEiweiß 84 g'
    const blurry = 'Fett 9 g'

    expect(bestReading([table, wholePhoto]).values).toMatchObject({ fat: 9.8, protein: 8.4 })
    expect(bestReading([blurry, wholePhoto]).values).toMatchObject({ fat: 98, protein: 84 })
    expect(bestReading([]).found).toBe(0)
  })

  test('values the best reading missed are taken from the other', () => {
    const table = 'Fett 9,8 g\nEiweiß 8,4 g'
    const wholePhoto = 'Fett 98 g\nSalz 0,48 g'

    expect(bestReading([table, wholePhoto])).toMatchObject({
      values: { fat: 9.8, protein: 8.4, salt: 0.48 },
      found: 3,
    })
  })
})
