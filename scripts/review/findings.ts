// Checks the review routine's findings before they are sent, with every problem listed at once,
// so the routine can correct its file. The database checks again (submit_review_findings).

const INGREDIENT_KINDS = [
  'typo',
  'brand',
  'unit_name',
  'unit_weight',
  'duplicate',
  'values',
  'other',
] as const
const DAY_KINDS = ['missing_meal', 'low_day', 'odd_amount', 'double_entry', 'zero_kcal'] as const
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']

const NUTRIENTS = ['fat', 'sat_fat', 'carbs', 'sugar', 'fiber', 'protein', 'salt']

/** The ingredient fields a fix may change; the app applies the same ones (suggestion.ts). */
export const SUGGESTABLE_FIELDS: readonly string[] = [
  'name',
  'brand',
  'unit_label',
  'unit_weight_g',
  'kcal_100',
  ...NUTRIENTS.map((nutrient) => `${nutrient}_100`),
  'kcal_unit',
  ...NUTRIENTS.map((nutrient) => `${nutrient}_unit`),
]

const MAX_FINDINGS = 100
const MAX_MESSAGE = 500

/** What `review.ts fetch` wrote (review-data.json), as far as the checks need it. */
export type ReviewData = {
  readonly ingredients: ReadonlyArray<{ readonly id: string }>
  readonly meals?: {
    readonly from: string
    readonly to: string
    readonly members: ReadonlyArray<{ readonly id: string }>
    readonly meals: ReadonlyArray<{
      readonly user_id: string
      readonly date: string
      readonly items: ReadonlyArray<{ readonly id: string }>
    }>
  }
}

type ReviewContext = {
  readonly ingredientIds: ReadonlySet<string>
  readonly memberIds: ReadonlySet<string>
  readonly from: string
  readonly to: string
  /** item id -> "person|date" */
  readonly itemDays: ReadonlyMap<string, string>
}

export function reviewContext(data: ReviewData): ReviewContext {
  const meals = data.meals
  return {
    ingredientIds: new Set(data.ingredients.map(({ id }) => id)),
    memberIds: new Set(meals?.members.map(({ id }) => id) ?? []),
    from: meals?.from ?? '',
    to: meals?.to ?? '',
    itemDays: new Map(
      (meals?.meals ?? []).flatMap(({ user_id, date, items }) =>
        items.map(({ id }) => [id, `${user_id}|${date}`] as const),
      ),
    ),
  }
}

type Finding = Readonly<Record<string, unknown>>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function messageProblems(message: unknown): string[] {
  return typeof message !== 'string' || message.trim().length === 0 || message.length > MAX_MESSAGE
    ? [`message must be 1–${MAX_MESSAGE} characters`]
    : []
}

function ingredientProblems(finding: Record<string, unknown>, context: ReviewContext): string[] {
  const { ingredient_id, kind, message, suggestion = {} } = finding
  const problems: string[] = []
  if (typeof ingredient_id !== 'string' || !context.ingredientIds.has(ingredient_id)) {
    problems.push('ingredient_id is not one of the household’s ingredients')
  }
  if (!INGREDIENT_KINDS.includes(kind as (typeof INGREDIENT_KINDS)[number])) {
    problems.push(`kind must be one of ${INGREDIENT_KINDS.join(', ')}`)
  }
  problems.push(...messageProblems(message))
  if (!isRecord(suggestion)) return [...problems, 'suggestion must be an object']
  if (kind === 'duplicate') return [...problems, ...duplicateProblems(finding, suggestion, context)]
  for (const [field, fix] of Object.entries(suggestion)) {
    if (!SUGGESTABLE_FIELDS.includes(field)) {
      problems.push(`suggestion field ${field} can’t be changed`)
    } else if (fix !== null && typeof fix !== 'string' && typeof fix !== 'number') {
      problems.push(`suggestion value for ${field} must be text, a number or null`)
    }
  }
  return problems
}

/** A duplicate names the other ingredient, so the app can offer to merge the two. */
function duplicateProblems(
  { ingredient_id }: Record<string, unknown>,
  suggestion: Record<string, unknown>,
  context: ReviewContext,
): string[] {
  const other = suggestion.duplicate_of
  const valid =
    Object.keys(suggestion).length === 1 &&
    typeof other === 'string' &&
    other !== ingredient_id &&
    context.ingredientIds.has(other)
  return valid
    ? []
    : ['a duplicate’s suggestion is { "duplicate_of": "<id of the other ingredient>" }']
}

function dayProblems(finding: Record<string, unknown>, context: ReviewContext): string[] {
  const { user_id, date, meal_type, meal_item_id, kind, message, suggestion } = finding
  const problems: string[] = []
  if (typeof user_id !== 'string' || !context.memberIds.has(user_id)) {
    problems.push('user_id is not a member of the household')
  }
  if (typeof date !== 'string' || date < context.from || date > context.to) {
    problems.push(`date must be a reviewed day, ${context.from} to ${context.to}`)
  }
  if (meal_type !== undefined && meal_type !== null && !MEAL_TYPES.includes(String(meal_type))) {
    problems.push(`meal_type must be one of ${MEAL_TYPES.join(', ')}`)
  }
  if (!DAY_KINDS.includes(kind as (typeof DAY_KINDS)[number])) {
    problems.push(`kind must be one of ${DAY_KINDS.join(', ')}`)
  }
  problems.push(...messageProblems(message))
  if (
    meal_item_id !== undefined &&
    meal_item_id !== null &&
    context.itemDays.get(String(meal_item_id)) !== `${String(user_id)}|${String(date)}`
  ) {
    problems.push('meal_item_id is not an item of that person on that day')
  }
  if (suggestion !== undefined) problems.push('a day finding has no suggestion')
  return problems
}

function problemsOf(value: unknown, context: ReviewContext): string[] {
  if (!isRecord(value)) return ['must be an object']
  const aboutIngredient = value.ingredient_id !== undefined && value.ingredient_id !== null
  const aboutDay = value.user_id !== undefined || value.date !== undefined
  if (aboutIngredient === aboutDay) return ['give either ingredient_id or user_id and date']
  return aboutIngredient ? ingredientProblems(value, context) : dayProblems(value, context)
}

/** The findings, ready to send; throws with one line per problem ("#2: kind must be …"). */
export function checkFindings(value: unknown, context: ReviewContext): Finding[] {
  if (!Array.isArray(value)) throw new Error('findings must be a list')
  if (value.length > MAX_FINDINGS) throw new Error(`at most ${MAX_FINDINGS} findings per run`)
  const problems = value.flatMap((finding, index) =>
    problemsOf(finding, context).map((problem) => `#${index + 1}: ${problem}`),
  )
  if (problems.length > 0) throw new Error(problems.join('\n'))
  return value.map((finding: Record<string, unknown>) =>
    finding.ingredient_id ? { ...finding, suggestion: finding.suggestion ?? {} } : finding,
  )
}

const MAX_WITHDRAWALS = 200
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** The ids of findings to withdraw, checked; throws with one line per problem. */
export function checkWithdrawals(value: unknown): string[] {
  if (!Array.isArray(value)) throw new Error('withdrawals must be a list of finding ids')
  if (value.length > MAX_WITHDRAWALS) {
    throw new Error(`at most ${MAX_WITHDRAWALS} withdrawals per run`)
  }
  const seen = new Set<unknown>()
  const problems = value.flatMap((id, index) => {
    const repeated = seen.has(id)
    seen.add(id)
    if (typeof id !== 'string' || !UUID.test(id)) return [`#${index + 1}: not a finding id`]
    return repeated ? [`#${index + 1}: repeated`] : []
  })
  if (problems.length > 0) throw new Error(problems.join('\n'))
  return value as string[]
}
