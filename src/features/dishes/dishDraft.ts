import { roundTo } from '../../lib/numbers'
import { describeAmount, scaleItemAmount, type MealType } from '../meals/dayModel'
import type { Dish, DishLine, DishPortion, Eater, SplitMode } from './portions'

/**
 * Immutable edits of a dish in the editor. Lines are rescaled from their own nutrition snapshot,
 * so an edited line never needs its ingredient again (it may have been deleted meanwhile).
 */

const PERCENT_WHOLE = 100
const PERCENT_DECIMALS = 2
const DEFAULT_COUNT = 1

export type LineAmounts =
  | { readonly allocation: 'shared'; readonly amount: number }
  | { readonly allocation: 'per_portion'; readonly amounts: Readonly<Record<string, number>> }

export type LineWho =
  | { readonly kind: 'shared' }
  | { readonly kind: 'only'; readonly portionId: string }
  | { readonly kind: 'own' }

export function newId(): string {
  return crypto.randomUUID()
}

export function newDish(eaters: readonly Eater[]): Dish {
  return {
    id: newId(),
    name: null,
    splitMode: 'equal',
    cookedWeightG: null,
    // set when saved
    revision: '',
    portions: eaters.map((eater) => ({ id: newId(), eater, splitValue: null })),
    lines: [],
  }
}

export function withName(dish: Dish, name: string): Dish {
  return { ...dish, name: name.trim() || null }
}

function defaultSplitValue(mode: SplitMode, portionCount: number): number | null {
  if (mode === 'count') return DEFAULT_COUNT
  if (mode === 'percent') return roundTo(PERCENT_WHOLE / portionCount, PERCENT_DECIMALS)
  return null
}

/** A new split starts from sensible values: 1 each, an even share of 100 %, or empty weights. */
export function withSplitMode(dish: Dish, splitMode: SplitMode): Dish {
  const splitValue = defaultSplitValue(splitMode, dish.portions.length)
  return {
    ...dish,
    splitMode,
    portions: dish.portions.map((portion) => ({ ...portion, splitValue })),
  }
}

function withPortionChange(
  dish: Dish,
  portionId: string,
  change: (portion: DishPortion) => DishPortion,
): Dish {
  return {
    ...dish,
    portions: dish.portions.map((portion) =>
      portion.id === portionId ? change(portion) : portion,
    ),
  }
}

export function withSplitValue(dish: Dish, portionId: string, splitValue: number | null): Dish {
  return withPortionChange(dish, portionId, (portion) => ({ ...portion, splitValue }))
}

export function withCookedWeight(dish: Dish, cookedWeightG: number | null): Dish {
  return { ...dish, cookedWeightG }
}

export function withPortionMeal(dish: Dish, portionId: string, mealType: MealType): Dish {
  return withPortionChange(dish, portionId, (portion) =>
    portion.eater ? { ...portion, eater: { ...portion.eater, mealType } } : portion,
  )
}

export function withPortion(dish: Dish, eater: Eater): Dish {
  const splitValue = dish.splitMode === 'count' ? DEFAULT_COUNT : null
  return { ...dish, portions: [...dish.portions, { id: newId(), eater, splitValue }] }
}

/** Their own amounts go too; a line only they had disappears. */
export function withoutPortion(dish: Dish, portionId: string): Dish {
  const lines = dish.lines.flatMap((line) => {
    if (line.allocation === 'shared' || !(portionId in line.amounts)) return [line]
    const amounts = Object.fromEntries(
      Object.entries(line.amounts).filter(([id]) => id !== portionId),
    )
    if (Object.keys(amounts).length === 0) return []
    return [rescaledLine(line, { allocation: 'per_portion', amounts })]
  })
  return { ...dish, portions: dish.portions.filter((portion) => portion.id !== portionId), lines }
}

/** Adds the line, or replaces the line with the same id where it is. */
export function withLine(dish: Dish, line: DishLine): Dish {
  const exists = dish.lines.some((existing) => existing.id === line.id)
  return {
    ...dish,
    lines: exists
      ? dish.lines.map((existing) => (existing.id === line.id ? line : existing))
      : [...dish.lines, line],
  }
}

export function withoutLine(dish: Dish, lineId: string): Dish {
  return { ...dish, lines: dish.lines.filter((line) => line.id !== lineId) }
}

/** The line with new amounts (in its unit), scaled from its snapshot. */
export function rescaledLine(line: DishLine, input: LineAmounts): DishLine {
  if (input.allocation === 'shared') {
    return {
      ...line,
      allocation: 'shared',
      item: { ...line.item, ...scaleItemAmount(line.item, input.amount) },
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
    ...line,
    allocation: 'per_portion',
    item: { ...line.item, ...scaleItemAmount(line.item, total) },
    amounts,
  }
}

export function lineWho(line: DishLine): LineWho {
  if (line.allocation === 'shared') return { kind: 'shared' }
  const portionIds = Object.keys(line.amounts)
  const [only] = portionIds
  return portionIds.length === 1 && only ? { kind: 'only', portionId: only } : { kind: 'own' }
}

function amountText(line: DishLine, amount: number): string {
  return describeAmount({ entered_amount: amount, entered_unit: line.item.entered_unit })
}

/** e.g. "400 g · shared", "20 g · only Lisa", "Lukas 120 g · Lisa 100 g" */
export function describeLine(line: DishLine, nameOf: (portionId: string) => string): string {
  const who = lineWho(line)
  if (who.kind === 'shared') return `${amountText(line, line.item.entered_amount)} · shared`
  if (who.kind === 'only') {
    return `${amountText(line, line.item.entered_amount)} · only ${nameOf(who.portionId)}`
  }
  return Object.entries(line.amounts)
    .map(([portionId, amount]) => `${nameOf(portionId)} ${amountText(line, amount)}`)
    .join(' · ')
}
