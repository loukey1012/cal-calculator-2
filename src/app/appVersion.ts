/** The version running: its commit and when it was built (set at build time, vite.config.ts). */
export type AppVersion = { readonly id: string; readonly builtAt: string }

export const APP_VERSION: AppVersion = __APP_VERSION__

export const VERSION_STORAGE_KEY = 'calculator.lastStartedVersion'
const SHORT_COMMIT_LENGTH = 7
const BUILD_DAY: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }

/**
 * Remembers the version this start runs; true when it differs from the one the last start ran,
 * i.e. the first start on a new version. A first install (nothing remembered yet) says nothing.
 */
export function recordVersion(storage: Storage, current: string): boolean {
  try {
    const previous = storage.getItem(VERSION_STORAGE_KEY)
    if (previous === current) return false
    storage.setItem(VERSION_STORAGE_KEY, current)
    return previous !== null
  } catch {
    // e.g. storage blocked: no toast rather than one on every start
    return false
  }
}

let updatedThisStart: boolean | null = null

/** Whether this start is the first on a new version; checked once per start. */
export function wasUpdatedThisStart(): boolean {
  updatedThisStart ??= recordVersion(window.localStorage, APP_VERSION.id)
  return updatedThisStart
}

/** e.g. "8 Oct 2026 · 9a26e06" */
export function formatVersion(version: AppVersion, locale?: string): string {
  const day = new Intl.DateTimeFormat(locale, BUILD_DAY).format(new Date(version.builtAt))
  return `${day} · ${version.id.slice(0, SHORT_COMMIT_LENGTH)}`
}
