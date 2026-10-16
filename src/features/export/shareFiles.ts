export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled'

// browsers may start a download only after the click returns: keep the file around a while
const REVOKE_AFTER_MS = 10_000

/**
 * Hands the files to the iPhone's share sheet (Save to Files, Mail, …); where files can't be
 * shared (e.g. a desktop browser), each one is downloaded instead.
 */
export async function shareOrDownload(
  files: readonly File[],
  title: string,
): Promise<ShareOutcome> {
  const data = { files: [...files], title }
  if (typeof navigator.canShare === 'function' && navigator.canShare(data)) {
    try {
      await navigator.share(data)
      return 'shared'
    } catch (error) {
      // closing the share sheet isn't an error
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
      throw error
    }
  }
  for (const file of files) {
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = file.name
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS)
  }
  return 'downloaded'
}
