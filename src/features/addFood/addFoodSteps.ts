import { normalizeBarcode } from '../barcode/barcode'
import type { ComposerStep } from '../dishes/composerSteps'

const ADD_SEGMENT = 'add'
const CUSTOM_SEGMENT = 'custom'
const NEW_INGREDIENT_SEGMENT = 'new'
// a new ingredient for a scanned barcode, e.g. new-4014500513102 (ingredient ids are UUIDs)
const BARCODE_PREFIX = 'new-'
const LINE_PREFIX = 'line-'
const WEIGH_PREFIX = 'weigh-'
const SWAP_SEGMENT = 'swap'

/**
 * The address of an Add food step below `base` (a meal's Add food page). Each step is one level below
 * the step Back leads to, so the page stack's back swipe (which drops the last part of the
 * address) goes back exactly one step.
 */
export function addFoodStepPath(step: ComposerStep, base: string): string {
  switch (step.kind) {
    case 'main':
      return base
    case 'pick':
      return `${base}/${ADD_SEGMENT}`
    case 'custom':
      return `${base}/${ADD_SEGMENT}/${CUSTOM_SEGMENT}`
    case 'newIngredient':
      return step.barcode
        ? `${base}/${ADD_SEGMENT}/${BARCODE_PREFIX}${step.barcode}`
        : `${base}/${ADD_SEGMENT}/${NEW_INGREDIENT_SEGMENT}`
    case 'newLine':
      return `${base}/${ADD_SEGMENT}/${encodeURIComponent(step.ingredientId)}`
    case 'editLine':
      return `${base}/${LINE_PREFIX}${encodeURIComponent(step.lineId)}`
    case 'weighLine':
      return `${base}/${WEIGH_PREFIX}${encodeURIComponent(step.itemId)}`
    case 'swap':
      return `${addFoodStepPath({ kind: 'editLine', lineId: step.lineId }, base)}/${SWAP_SEGMENT}`
    case 'swapLine':
      return `${addFoodStepPath({ kind: 'swap', lineId: step.lineId }, base)}/${encodeURIComponent(step.ingredientId)}`
  }
}

function decoded(segment: string): string | null {
  try {
    return decodeURIComponent(segment)
  } catch {
    return null
  }
}

/** line-<id>, line-<id>/swap, line-<id>/swap/<ingredient id> */
function lineStepOf(segments: readonly string[]): ComposerStep | null {
  const [first = '', second, third, ...rest] = segments
  const lineId = decoded(first.slice(LINE_PREFIX.length))
  if (!lineId || rest.length > 0) return null
  if (second === undefined) return { kind: 'editLine', lineId }
  if (second !== SWAP_SEGMENT) return null
  if (third === undefined) return { kind: 'swap', lineId }
  const ingredientId = decoded(third)
  return ingredientId ? { kind: 'swapLine', lineId, ingredientId } : null
}

function stepOfSegments(segments: readonly string[]): ComposerStep | null {
  const [first, second, ...rest] = segments
  if (first === undefined) return { kind: 'main' }
  if (first.startsWith(LINE_PREFIX)) return lineStepOf(segments)
  if (first.startsWith(WEIGH_PREFIX)) {
    const itemId = decoded(first.slice(WEIGH_PREFIX.length))
    return itemId && second === undefined && rest.length === 0
      ? { kind: 'weighLine', itemId }
      : null
  }
  if (rest.length > 0) return null
  if (first === ADD_SEGMENT) {
    if (second === undefined) return { kind: 'pick' }
    if (second === CUSTOM_SEGMENT) return { kind: 'custom' }
    if (second === NEW_INGREDIENT_SEGMENT) return { kind: 'newIngredient' }
    if (second.startsWith(BARCODE_PREFIX)) {
      const barcode = normalizeBarcode(second.slice(BARCODE_PREFIX.length))
      return barcode ? { kind: 'newIngredient', barcode } : null
    }
    const ingredientId = decoded(second)
    return ingredientId ? { kind: 'newLine', ingredientId } : null
  }
  return null
}

/** The step an address below `base` shows; anything unknown shows the dish. */
export function addFoodStepOf(path: string, base: string): ComposerStep {
  const segments = path
    .slice(base.length)
    .split('/')
    .filter((segment) => segment !== '')
  return stepOfSegments(segments) ?? { kind: 'main' }
}

/** Where Back leads from a step. */
export function parentStep(step: ComposerStep): ComposerStep {
  switch (step.kind) {
    case 'custom':
    case 'newIngredient':
    case 'newLine':
      return { kind: 'pick' }
    case 'swap':
      return { kind: 'editLine', lineId: step.lineId }
    case 'swapLine':
      return { kind: 'swap', lineId: step.lineId }
    default:
      return { kind: 'main' }
  }
}
