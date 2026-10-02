/** Marks each tab's own vertical scroller (the carousel itself must never scroll). */
export const TAB_SCROLLER_ATTRIBUTE = 'data-tab-scroller'

/**
 * Scrolls the tab page containing `element` back to its top. Unlike scrollIntoView, this
 * leaves the carousel around it alone: scrolling that sideways would show a neighbouring page.
 */
export function scrollTabPageToTop(element: Element | null): void {
  const scroller = element?.closest(`[${TAB_SCROLLER_ATTRIBUTE}]`)
  if (!scroller) return
  scroller.scrollTop = 0
  // once more after layout: iOS momentum scrolling from the previous view can still be running
  requestAnimationFrame(() => {
    scroller.scrollTop = 0
  })
}
