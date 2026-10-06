import { createContext, useContext } from 'react'
import { useLocation } from 'react-router'

/**
 * The path a page is shown for. Usually the address, but the page stack also shows the page
 * below (the one a back swipe leads to) and a page sliding away, each for its own path.
 */
export const PagePathContext = createContext<string | null>(null)

export function usePagePath(): string {
  const { pathname } = useLocation()
  return useContext(PagePathContext) ?? pathname
}
