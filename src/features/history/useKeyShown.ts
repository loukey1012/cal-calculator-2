import { useState } from 'react'

/** On this phone only: the key is a help, not part of the account. */
export const KEY_SHOWN_STORAGE_KEY = 'calculator-calendar-key-shown'

function readKeyShown(): boolean {
  try {
    // hidden unless it was shown on purpose
    return localStorage.getItem(KEY_SHOWN_STORAGE_KEY) === 'true'
  } catch {
    // blocked storage: leave the key hidden
    return false
  }
}

function rememberKeyShown(shown: boolean): void {
  try {
    localStorage.setItem(KEY_SHOWN_STORAGE_KEY, String(shown))
  } catch {
    // private browsing or full storage: the choice only lasts until the app closes
  }
}

/** Whether the key is shown, remembered on this phone; hidden until it was shown on purpose. */
export function useKeyShown(): readonly [boolean, (shown: boolean) => void] {
  const [shown, setShown] = useState(readKeyShown)
  function change(next: boolean) {
    rememberKeyShown(next)
    setShown(next)
  }
  return [shown, change]
}
