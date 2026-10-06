export const LINK_COPIED = 'Link copied. Paste it in Safari to add CALculator again.'

/**
 * Copies the app's address, for adding it to the home screen again. Must be started from a tap:
 * iOS only lets a page write to the clipboard during one. Resolves with the message to show.
 */
export async function copyAppLink(): Promise<string> {
  try {
    await navigator.clipboard.writeText(window.location.origin)
    return LINK_COPIED
  } catch {
    return `Couldn’t copy the link: ${window.location.host}`
  }
}
