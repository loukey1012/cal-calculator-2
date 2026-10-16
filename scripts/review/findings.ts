// Checks the review routine's findings before they are sent, with every problem listed at once,
// so the routine can correct its file. The database checks again (submit_ingredient_findings).

export const FINDING_KINDS = [
  'typo',
  'brand',
  'unit_name',
  'unit_weight',
  'duplicate',
  'values',
  'other',
] as const

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

export const MAX_FINDINGS = 100
const MAX_MESSAGE = 500

export type Finding = {
  readonly ingredient_id: string
  readonly kind: (typeof FINDING_KINDS)[number]
  readonly message: string
  readonly suggestion: Readonly<Record<string, string | number | null>>
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function problemsOf(value: unknown, ingredientIds: ReadonlySet<string>): string[] {
  if (!isRecord(value)) return ['must be an object']
  const { ingredient_id, kind, message, suggestion = {} } = value
  const problems: string[] = []
  if (typeof ingredient_id !== 'string' || !ingredientIds.has(ingredient_id)) {
    problems.push('ingredient_id is not one of the household’s ingredients')
  }
  if (!FINDING_KINDS.includes(kind as Finding['kind'])) {
    problems.push(`kind must be one of ${FINDING_KINDS.join(', ')}`)
  }
  if (typeof message !== 'string' || message.trim().length === 0 || message.length > MAX_MESSAGE) {
    problems.push(`message must be 1–${MAX_MESSAGE} characters`)
  }
  if (!isRecord(suggestion)) return [...problems, 'suggestion must be an object']
  for (const [field, fix] of Object.entries(suggestion)) {
    if (!SUGGESTABLE_FIELDS.includes(field)) {
      problems.push(`suggestion field ${field} can’t be changed`)
    } else if (fix !== null && typeof fix !== 'string' && typeof fix !== 'number') {
      problems.push(`suggestion value for ${field} must be text, a number or null`)
    }
  }
  return problems
}

/** The findings, ready to send; throws with one line per problem ("#2: kind must be …"). */
export function checkFindings(value: unknown, ingredientIds: ReadonlySet<string>): Finding[] {
  if (!Array.isArray(value)) throw new Error('findings must be a list')
  if (value.length > MAX_FINDINGS) throw new Error(`at most ${MAX_FINDINGS} findings per run`)
  const problems = value.flatMap((finding, index) =>
    problemsOf(finding, ingredientIds).map((problem) => `#${index + 1}: ${problem}`),
  )
  if (problems.length > 0) throw new Error(problems.join('\n'))
  return value.map((finding: Record<string, unknown>) => ({
    ...(finding as Finding),
    suggestion: (finding.suggestion as Finding['suggestion'] | undefined) ?? {},
  }))
}
