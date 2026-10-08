import type { ComposerStep } from '../dishes/composerSteps'

export const COOK_PATH = '/cook'
const ADD_SEGMENT = 'add'
const CUSTOM_SEGMENT = 'custom'
const LINE_PREFIX = 'line-'

/**
 * The address of a Cook step. Each step is one level below the step Back leads to, so the page
 * stack's back swipe (which drops the last part of the address) goes back exactly one step.
 */
export function cookStepPath(step: ComposerStep): string {
  switch (step.kind) {
    case 'main':
      return COOK_PATH
    case 'pick':
      return `${COOK_PATH}/${ADD_SEGMENT}`
    case 'custom':
      return `${COOK_PATH}/${ADD_SEGMENT}/${CUSTOM_SEGMENT}`
    case 'newLine':
      return `${COOK_PATH}/${ADD_SEGMENT}/${encodeURIComponent(step.ingredientId)}`
    case 'editLine':
      return `${COOK_PATH}/${LINE_PREFIX}${encodeURIComponent(step.lineId)}`
  }
}

function decoded(segment: string): string | null {
  try {
    return decodeURIComponent(segment)
  } catch {
    return null
  }
}

function stepOfSegments(segments: readonly string[]): ComposerStep | null {
  const [first, second, ...rest] = segments
  if (first === undefined) return { kind: 'main' }
  if (rest.length > 0) return null
  if (first === ADD_SEGMENT) {
    if (second === undefined) return { kind: 'pick' }
    if (second === CUSTOM_SEGMENT) return { kind: 'custom' }
    const ingredientId = decoded(second)
    return ingredientId ? { kind: 'newLine', ingredientId } : null
  }
  if (second !== undefined || !first.startsWith(LINE_PREFIX)) return null
  const lineId = decoded(first.slice(LINE_PREFIX.length))
  return lineId ? { kind: 'editLine', lineId } : null
}

/** The step an address under Cook shows; anything unknown shows the dish. */
export function cookStepOf(path: string): ComposerStep {
  const segments = path
    .slice(COOK_PATH.length)
    .split('/')
    .filter((segment) => segment !== '')
  return stepOfSegments(segments) ?? { kind: 'main' }
}

/** Where Back leads from a step. */
export function parentStep(step: ComposerStep): ComposerStep {
  return step.kind === 'newLine' || step.kind === 'custom' ? { kind: 'pick' } : { kind: 'main' }
}
