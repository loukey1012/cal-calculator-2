import { roundTo } from '../../lib/numbers'
import type { MealType } from '../meals/dayModel'
import { buildMealItem, type MealItemDraft, type MealItemSource } from '../nutrition/fromIngredient'
import type { AmountUnit } from '../nutrition/types'

/**
 * A dish is one cooking: ingredient lines plus one or more portions. Shared lines are divided by
 * the dish's split; lines with own amounts give each portion exactly its amount. Every eaten
 * portion becomes ordinary meal items in its eater's meal, so totals work as for any meal.
 */

/** equal and count divide the pot among the portions; percent and weight are absolute parts. */
export type SplitMode = 'equal' | 'count' | 'percent' | 'weight'
export type LineAllocation = 'shared' | 'per_portion'

export type Eater = {
  readonly userId: string
  /** local YYYY-MM-DD */
  readonly date: string
  readonly mealType: MealType
}

export type DishPortion = {
  readonly id: string
  /** null while nobody has eaten it yet: a leftover */
  readonly eater: Eater | null
  /** count, percent or plate grams, depending on the split; unused for equal */
  readonly splitValue: number | null
}

export type DishLine = {
  readonly id: string
  readonly allocation: LineAllocation
  /** Nutrition snapshot and the whole amount cooked (for own amounts: their sum). */
  readonly item: MealItemDraft
  /** Own amounts by portion id, in the line's unit; a missing portion doesn't have it. */
  readonly amounts: Readonly<Record<string, number>>
}

export type Dish = {
  readonly id: string
  readonly name: string | null
  readonly splitMode: SplitMode
  /** the whole cooked pot, for the weight split */
  readonly cookedWeightG: number | null
  readonly portions: readonly DishPortion[]
  readonly lines: readonly DishLine[]
}

export type PortionItem = { readonly lineId: string; readonly draft: MealItemDraft }

export type PortionItems = {
  readonly portionId: string
  readonly eater: Eater | null
  readonly items: readonly PortionItem[]
}

type LineBase = { readonly id: string; readonly source: MealItemSource; readonly unit: AmountUnit }

export type DishLineInput =
  | (LineBase & { readonly allocation: 'shared'; readonly amount: number })
  | (LineBase & {
      readonly allocation: 'per_portion'
      readonly amounts: Readonly<Record<string, number>>
    })

const PERCENT_WHOLE = 100
// match meal_items numeric(10, 4) and numeric(9, 2)
const MULTIPLIER_DECIMALS = 4
const AMOUNT_DECIMALS = 2

export function buildDishLine(input: DishLineInput): DishLine {
  if (input.allocation === 'shared') {
    return {
      id: input.id,
      allocation: 'shared',
      item: buildMealItem(input.source, input.amount, input.unit),
      amounts: {},
    }
  }
  const entries = Object.entries(input.amounts)
  if (entries.some(([, amount]) => !Number.isFinite(amount) || amount < 0)) {
    throw new RangeError('Amounts must be zero or more')
  }
  const amounts = Object.fromEntries(entries.filter(([, amount]) => amount > 0))
  const total = Object.values(amounts).reduce((sum, amount) => sum + amount, 0)
  if (total <= 0) throw new RangeError('Give at least one person an amount')
  return {
    id: input.id,
    allocation: 'per_portion',
    item: buildMealItem(input.source, total, input.unit),
    amounts,
  }
}

function splitValuesOf(portions: readonly DishPortion[]): readonly number[] {
  return portions.map(({ splitValue }) => {
    if (splitValue === null || !Number.isFinite(splitValue)) {
      throw new RangeError('Every portion needs a value for this split')
    }
    if (splitValue < 0) throw new RangeError('Split values must be zero or more')
    return splitValue
  })
}

function sharesFor({ splitMode, cookedWeightG, portions }: Dish): readonly number[] {
  if (splitMode === 'equal') return portions.map(() => 1 / portions.length)

  const splitValues = splitValuesOf(portions)
  const sum = splitValues.reduce((total, value) => total + value, 0)
  switch (splitMode) {
    case 'count':
      if (sum <= 0) throw new RangeError('At least one portion needs a count above zero')
      return splitValues.map((value) => value / sum)
    case 'percent':
      if (sum > PERCENT_WHOLE) throw new RangeError('The percentages add up to more than 100 %')
      return splitValues.map((value) => value / PERCENT_WHOLE)
    case 'weight':
      if (cookedWeightG === null || cookedWeightG <= 0) {
        throw new RangeError('Weigh the cooked dish to split it by weight')
      }
      if (sum > cookedWeightG) throw new RangeError('The plates weigh more than the cooked dish')
      return splitValues.map((value) => value / cookedWeightG)
  }
}

/** Each portion's part of the shared lines (0–1), by portion id. */
export function portionShares(dish: Dish): ReadonlyMap<string, number> {
  if (dish.portions.length === 0) throw new RangeError('A dish needs at least one portion')
  const shares = sharesFor(dish)
  return new Map(dish.portions.map((portion, index) => [portion.id, shares[index] ?? 0]))
}

/** The line scaled to a part of what was cooked; null when that part is too small to log. */
function scaledItem(item: MealItemDraft, fraction: number): MealItemDraft | null {
  const amount = roundTo(item.entered_amount * fraction, AMOUNT_DECIMALS)
  const multiplier = roundTo(item.basis_multiplier * fraction, MULTIPLIER_DECIMALS)
  if (amount <= 0 || multiplier <= 0) return null
  return { ...item, entered_amount: amount, basis_multiplier: multiplier }
}

function fractionOfLine(line: DishLine, portionId: string, share: number): number {
  if (line.allocation === 'shared') return share
  return (line.amounts[portionId] ?? 0) / line.item.entered_amount
}

/** What every portion (leftovers included) contains, ready to log into its eater's meal. */
export function portionItems(dish: Dish): readonly PortionItems[] {
  const shares = portionShares(dish)
  return dish.portions.map((portion) => {
    const share = shares.get(portion.id) ?? 0
    const items = dish.lines.flatMap((line) => {
      const fraction = fractionOfLine(line, portion.id, share)
      const draft = fraction > 0 ? scaledItem(line.item, fraction) : null
      return draft ? [{ lineId: line.id, draft }] : []
    })
    return { portionId: portion.id, eater: portion.eater, items }
  })
}
