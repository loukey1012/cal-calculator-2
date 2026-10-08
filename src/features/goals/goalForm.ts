import { z } from 'zod'
import { fieldErrors, type FieldErrors } from '../../lib/forms'
import { parseDecimal } from '../../lib/numbers'
import type { Goal } from '../nutrition/goals'
import { formatKcal, toWholeKcal } from '../nutrition/format'
import { parseWeight } from '../weight/weight'

// goal_history: kcal integer, grams numeric(6, 1)
const MAX_KCAL = 99_999
const MAX_GRAMS = 99_999.9

export type GoalFormValues = {
  readonly kcal: string
  readonly protein: string
  readonly carbs: string
  readonly fat: string
  readonly fiber: string
  /** target weight in kg */
  readonly weight: string
}

export const EMPTY_GOAL_FORM: GoalFormValues = {
  kcal: '',
  protein: '',
  carbs: '',
  fat: '',
  fiber: '',
  weight: '',
}

export type GoalInput = Omit<Goal, 'validFrom'>

export type GoalFormResult =
  | { readonly success: true; readonly data: GoalInput }
  | { readonly success: false; readonly errors: FieldErrors }

function grams() {
  return z.string().transform((raw, ctx) => {
    if (raw.trim() === '') return null
    const value = parseDecimal(raw)
    if (value === null || value > MAX_GRAMS) {
      ctx.addIssue({ code: 'custom', message: value === null ? 'Enter a number' : 'Too large' })
      return z.NEVER
    }
    return value
  })
}

const kcal = z.string().transform((raw, ctx) => {
  const value = raw.trim() === '' ? null : parseDecimal(raw)
  const problem =
    raw.trim() === ''
      ? 'Enter your calorie goal'
      : value === null
        ? 'Enter a number'
        : value <= 0
          ? 'Must be more than 0'
          : value > MAX_KCAL
            ? 'Too large'
            : null
  if (problem !== null || value === null) {
    ctx.addIssue({ code: 'custom', message: problem ?? 'Enter a number' })
    return z.NEVER
  }
  // calories are always whole numbers, rounded up
  return toWholeKcal(value)
})

const goalFormSchema = z.object({
  kcal,
  protein: grams(),
  carbs: grams(),
  fat: grams(),
  fiber: grams(),
  weight: z.string().transform((raw, ctx) => {
    if (raw.trim() === '') return null
    const parsed = parseWeight(raw)
    if (!parsed.ok) {
      ctx.addIssue({ code: 'custom', message: parsed.message })
      return z.NEVER
    }
    return parsed.weightKg
  }),
})

export function parseGoalForm(values: GoalFormValues): GoalFormResult {
  const result = goalFormSchema.safeParse(values)
  if (!result.success) return { success: false, errors: fieldErrors(result.error) }
  const { protein, carbs, fat, fiber, weight } = result.data
  return {
    success: true,
    data: {
      kcal: result.data.kcal,
      proteinG: protein,
      carbsG: carbs,
      fatG: fat,
      fiberG: fiber,
      weightGoalKg: weight,
    },
  }
}

const asText = (value: number | null) => (value === null ? '' : String(value))

export function toGoalFormValues(goal: Goal | null): GoalFormValues {
  if (!goal) return EMPTY_GOAL_FORM
  return {
    kcal: String(goal.kcal),
    protein: asText(goal.proteinG),
    carbs: asText(goal.carbsG),
    fat: asText(goal.fatG),
    fiber: asText(goal.fiberG),
    weight: asText(goal.weightGoalKg),
  }
}

const gramsFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 })

/** e.g. "2,000 kcal · P 120 g · F 60.5 g" (only the targets that are set) */
export function describeGoal(goal: Goal | null): string {
  if (!goal) return 'Not set'
  const macros = [
    ['P', goal.proteinG],
    ['C', goal.carbsG],
    ['F', goal.fatG],
    ['Fib', goal.fiberG],
  ] as const
  return [
    `${formatKcal(goal.kcal)} kcal`,
    ...macros.flatMap(([letter, grams]) =>
      grams === null ? [] : [`${letter} ${gramsFormat.format(grams)} g`],
    ),
    ...(goal.weightGoalKg === null ? [] : [`Weight ${gramsFormat.format(goal.weightGoalKg)} kg`]),
  ].join(' · ')
}
