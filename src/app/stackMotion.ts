/**
 * The maths of the iOS navigation stack: the page on top slides right to reveal the one below,
 * which waits a little to the left (parallax) and slightly dimmed.
 */

/** how far left the page below starts, as a part of the screen width */
export const BACK_PARALLAX = 0.3
/** iOS-like push and pop */
export const STACK_DURATION_MS = 400
export const STACK_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)'

// movement before a drag counts as sideways or not, and how much straighter than vertical
const DIRECTION_THRESHOLD_PX = 10
const MIN_SIDEWAYS_RATIO = 1.2
// a release completes "back" past this part of the width, or with a flick this fast (px/ms)
const COMPLETE_DISTANCE = 1 / 3
const COMPLETE_VELOCITY = 0.5

export type DragDirection = 'back' | 'other'

/** null until the finger moved far enough to tell. */
export function dragDirection(dx: number, dy: number): DragDirection | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < DIRECTION_THRESHOLD_PX) return null
  return dx > 0 && dx > Math.abs(dy) * MIN_SIDEWAYS_RATIO ? 'back' : 'other'
}

/** Released: go back, or spring the page into place again. */
export function releaseCompletesBack(dx: number, width: number, velocity: number): boolean {
  if (velocity >= COMPLETE_VELOCITY) return true
  if (velocity <= -COMPLETE_VELOCITY) return false
  return dx >= width * COMPLETE_DISTANCE
}

function isInside(child: string, parent: string): boolean {
  return child.startsWith(`${parent}/`)
}

/** A deeper page opened (push), back to a page above (pop), or neither. */
export function stackChange(from: string, to: string): 'push' | 'pop' | null {
  if (isInside(to, from)) return 'push'
  if (isInside(from, to)) return 'pop'
  return null
}

export type LayerTransforms = {
  readonly top: string
  readonly under: string
  /** opacity of the shade over the page below */
  readonly dim: number
}

/** Where both pages are at `progress` (0: the top page covers all, 1: it is gone). */
export function layerTransforms(progress: number, width: number): LayerTransforms {
  const p = Math.min(1, Math.max(0, progress))
  return {
    top: `translate3d(${toPixels(p * width)}px, 0, 0)`,
    under: `translate3d(${toPixels(-(1 - p) * width * BACK_PARALLAX)}px, 0, 0)`,
    dim: 1 - p,
  }
}

// hundredths of a pixel are plenty, and keep 100px from turning into 99.99999999999999px
function toPixels(value: number): number {
  return Math.round(value * 100) / 100 || 0
}
