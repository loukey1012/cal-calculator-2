import type { AppIcon } from './appearance'

type AppIconFiles = { readonly touchIcon: string; readonly svg: string }

/** The home-screen icon (apple-touch-icon) and the browser-tab icon of one app icon choice. */
export function appIconFiles(icon: AppIcon): AppIconFiles {
  return {
    touchIcon: `/icons/${icon}/apple-touch-icon-180x180.png`,
    svg: `/icons/${icon}/icon.svg`,
  }
}

/**
 * Points the page's icon links at the chosen icon. iOS reads the touch icon only when the app is
 * added to the home screen, so an installed app keeps its icon until it is added again.
 * Mirrors the inline script in index.html, which does the same before the app loads.
 */
export function applyAppIcon(icon: AppIcon): void {
  const { touchIcon, svg } = appIconFiles(icon)
  document.querySelector('link[rel="apple-touch-icon"]')?.setAttribute('href', touchIcon)
  document.querySelector('link[rel="icon"][type="image/svg+xml"]')?.setAttribute('href', svg)
}
