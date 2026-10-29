import type { Enums } from '../../lib/database.types'
import { mealLabel, MEAL_TYPES } from '../meals/dayModel'
import type { MealType } from '../meals/dayModel'
import type { CsvValue } from './csv'

type Nutrients = {
  readonly protein: number | null
  readonly carbs: number | null
  readonly sugar: number | null
  readonly fat: number | null
  readonly sat_fat: number | null
  readonly fiber: number | null
  readonly salt: number | null
}

/** What the export loads for the chosen days (exportApi), for both members. */
export type ExportData = {
  /** in the order the files list them */
  readonly people: ReadonlyArray<{ readonly id: string; readonly name: string }>
  readonly meals: ReadonlyArray<{
    readonly user_id: string
    readonly date: string
    readonly meal_type: MealType
    readonly meal_items: ReadonlyArray<
      Nutrients & {
        readonly name: string
        readonly brand: string | null
        readonly entered_amount: number
        readonly entered_unit: Enums<'amount_unit'>
        readonly basis_multiplier: number
        readonly kcal: number
        /** part of a dish whose calories are only roughly known */
        readonly estimated: boolean
      }
    >
  }>
  readonly days: ReadonlyArray<
    Nutrients & {
      readonly user_id: string
      readonly date: string
      readonly kcal: number | null
      readonly kcal_estimated: boolean | null
      readonly cheat_day?: boolean | null
      readonly cheat_meal?: boolean | null
      readonly alcohol_day?: boolean | null
    }
  >
  readonly weights: ReadonlyArray<{
    readonly user_id: string
    readonly date: string
    readonly weight_kg: number
  }>
  /** each person's own gym days */
  readonly gymDays: ReadonlyArray<{ readonly user_id: string; readonly date: string }>
  /** the household's sex days: they belong to both people */
  readonly sexDays: ReadonlyArray<{ readonly date: string }>
}

const NUTRIENT_COLUMNS = [
  ['fat', 'Fat (g)'],
  ['sat_fat', 'Saturated fat (g)'],
  ['carbs', 'Carbs (g)'],
  ['sugar', 'Sugar (g)'],
  ['fiber', 'Fiber (g)'],
  ['protein', 'Protein (g)'],
  ['salt', 'Salt (g)'],
] as const satisfies ReadonlyArray<readonly [keyof Nutrients, string]>

export const FOOD_HEADER = [
  'Person',
  'Date',
  'Meal',
  'Food',
  'Brand',
  'Amount',
  'Unit',
  'kcal',
  ...NUTRIENT_COLUMNS.map(([, title]) => title),
  'Estimate',
]

export const DAY_HEADER = [
  'Person',
  'Date',
  'kcal',
  ...NUTRIENT_COLUMNS.map(([, title]) => title),
  'Weight (kg)',
  'Estimate',
  'Cheat day',
  'Cheat meal',
  'Alcohol day',
  'Gym',
  'Sex',
]

const UNIT_NAMES: Record<Enums<'amount_unit'>, string> = { g: 'g', ml: 'ml', unit: 'pieces' }

const oneDecimal = (value: number | null) => (value === null ? null : Math.round(value * 10) / 10)
const wholeNumber = (value: number | null) => (value === null ? null : Math.round(value))
const scaled = (value: number | null, factor: number) => (value === null ? null : value * factor)

/** Sorts by day, then by person in the order given. */
function byDayAndPerson(data: ExportData) {
  const personOrder = new Map(data.people.map(({ id }, index) => [id, index]))
  return (a: { date: string; user_id: string }, b: { date: string; user_id: string }) =>
    a.date.localeCompare(b.date) ||
    (personOrder.get(a.user_id) ?? 0) - (personOrder.get(b.user_id) ?? 0)
}

function nameOf(data: ExportData, userId: string): string {
  return data.people.find(({ id }) => id === userId)?.name ?? ''
}

const mealOrder = (type: MealType) => MEAL_TYPES.findIndex((meal) => meal.type === type)

export function foodRows(data: ExportData): CsvValue[][] {
  const sameDay = byDayAndPerson(data)
  return [...data.meals]
    .sort((a, b) => sameDay(a, b) || mealOrder(a.meal_type) - mealOrder(b.meal_type))
    .flatMap((meal) =>
      meal.meal_items.map((item) => [
        nameOf(data, meal.user_id),
        meal.date,
        mealLabel(meal.meal_type),
        item.name,
        item.brand,
        item.entered_amount,
        UNIT_NAMES[item.entered_unit],
        wholeNumber(item.kcal * item.basis_multiplier),
        ...NUTRIENT_COLUMNS.map(([key]) => oneDecimal(scaled(item[key], item.basis_multiplier))),
        item.estimated,
      ]),
    )
}

export function dayRows(data: ExportData): CsvValue[][] {
  const keyOf = ({ user_id, date }: { user_id: string; date: string }) => `${user_id}|${date}`
  const totals = new Map(data.days.map((day) => [keyOf(day), day]))
  const weights = new Map(data.weights.map((entry) => [keyOf(entry), entry.weight_kg]))
  const gymKeys = new Set(data.gymDays.map(keyOf))
  const sexDates = new Set(data.sexDays.map(({ date }) => date))
  // a sex day is listed for both people, even when nothing else happened that day
  const sexRows = data.sexDays.flatMap(({ date }) =>
    data.people.map(({ id }) => ({ user_id: id, date })),
  )
  const days = [
    ...new Map(
      [...data.days, ...data.weights, ...data.gymDays, ...sexRows].map((row) => [keyOf(row), row]),
    ).values(),
  ]
  return days.sort(byDayAndPerson(data)).map((day) => {
    const total = totals.get(keyOf(day))
    return [
      nameOf(data, day.user_id),
      day.date,
      wholeNumber(total?.kcal ?? null),
      ...NUTRIENT_COLUMNS.map(([key]) => oneDecimal(total?.[key] ?? null)),
      weights.get(keyOf(day)) ?? null,
      total?.kcal_estimated ?? false,
      total?.cheat_day ?? false,
      total?.cheat_meal ?? false,
      total?.alcohol_day ?? false,
      gymKeys.has(keyOf(day)),
      sexDates.has(day.date),
    ]
  })
}
