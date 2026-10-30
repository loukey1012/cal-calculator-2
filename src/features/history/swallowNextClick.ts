/**
 * How long after a press ends the click that belongs to it may still arrive. A click after a
 * swipe, a hold or a dismissing tap is swallowed only this soon, so a later keyboard or
 * VoiceOver activation goes through.
 */
export const SWALLOW_CLICK_MS = 400

/**
 * Swallows the one click that follows the press that has just begun (it went to dismiss
 * something, as a tap outside an iOS menu does: the tap closes it and does nothing else). The
 * swallow ends with that click, or shortly after the press ends without one, or at once when the
 * press is cancelled (the browser took it for a scroll) or another press begins.
 */
export function swallowClickOfThisPress(): void {
  let timer: ReturnType<typeof setTimeout> | null = null
  const stop = () => {
    if (timer !== null) clearTimeout(timer)
    document.removeEventListener('click', onClick, true)
    window.removeEventListener('pointerup', onEnd, true)
    window.removeEventListener('pointercancel', stop, true)
    window.removeEventListener('pointerdown', stop, true)
  }
  function onClick(event: MouseEvent) {
    event.stopPropagation()
    event.preventDefault()
    stop()
  }
  function onEnd() {
    window.removeEventListener('pointerup', onEnd, true)
    timer = setTimeout(stop, SWALLOW_CLICK_MS)
  }
  document.addEventListener('click', onClick, true)
  window.addEventListener('pointerup', onEnd, true)
  window.addEventListener('pointercancel', stop, true)
  // a new press is not the one this click belongs to (the window's capture phase of the press
  // that called this is already over, so this does not end it at once)
  window.addEventListener('pointerdown', stop, true)
}
