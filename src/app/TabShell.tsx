import useEmblaCarousel from 'embla-carousel-react'
import { memo, useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import {
  CookIcon,
  HistoryIcon,
  IngredientsIcon,
  SettingsIcon,
  TodayIcon,
} from '../components/ios/icons'
import { TabBar } from '../components/ios/TabBar'
import { CookPage } from '../features/cook/CookPage'
import { HistoryPage } from '../features/history/HistoryPage'
import { IngredientsPage } from '../features/ingredients/IngredientsPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { TodayPage } from '../features/today/TodayPage'
import { useCurrentUser } from './currentUser'
import { useResumeOfflineChanges, useSaveWhenHidden } from './offlineLifecycle'
import { PageStack } from './PageStack'
import { SyncStatus } from './SyncStatus'
import { useAppearance } from '../features/appearance/useAppearance'

const TABS = [
  { id: 'today', label: 'Today', path: '/today', icon: <TodayIcon />, Page: TodayPage },
  // the one place food is logged
  { id: 'cook', label: 'Cook', path: '/cook', icon: <CookIcon />, Page: CookPage },
  { id: 'history', label: 'History', path: '/history', icon: <HistoryIcon />, Page: HistoryPage },
  {
    id: 'ingredients',
    label: 'Ingredients',
    path: '/ingredients',
    icon: <IngredientsIcon />,
    Page: IngredientsPage,
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: <SettingsIcon />,
    Page: SettingsPage,
    // /settings/appearance etc. are pages pushed on top of Settings: a swipe goes back
    hasSubPages: true,
  },
] as const

// Embla's scroll speed for swipes (higher = slower settle)
const SWIPE_SETTLE_DURATION = 22

// switching tabs replaces the history entry: like UITabBarController, tabs build no back stack

/** Pages only re-render for their own data, not when the active tab changes mid-swipe. */
const TabPageContent = memo(function TabPageContent({ Page }: { readonly Page: ComponentType }) {
  return <Page />
})

/** A page's padding (clear of the status bar and the tab bar) and width. */
function PageFrame({ children }: { readonly children: ReactNode }) {
  return (
    <div className="pt-safe-top pb-tabbar">
      <div className="mx-auto max-w-md px-4">{children}</div>
    </div>
  )
}

function tabIndexForPath(pathname: string): number {
  return TABS.findIndex((tab) => pathname === tab.path || pathname.startsWith(`${tab.path}/`))
}

/** Lets horizontal gestures that start inside `[data-swipe-lock]` (e.g. chip scrollers) stay local. */
function startsInSwipeLock(event: MouseEvent | TouchEvent): boolean {
  return event.target instanceof Element && event.target.closest('[data-swipe-lock]') !== null
}

/**
 * On a sub-page (e.g. Settings › Appearance › App colors) the page one level up a back swipe
 * leads to, otherwise null.
 */
function backPathFor(pathname: string): string | null {
  const tab = TABS.find((candidate) => pathname.startsWith(`${candidate.path}/`))
  if (!tab || !('hasSubPages' in tab)) return null
  return pathname.replace(/\/+$/, '').replace(/\/[^/]*$/, '')
}

/** The signed-in app: five pages side by side, switched by the tab bar or by swiping. */
export function TabShell() {
  const { profile } = useCurrentUser()
  useAppearance(profile)
  useResumeOfflineChanges()
  useSaveWhenHidden()

  const { pathname } = useLocation()
  const navigate = useNavigate()
  const routeIndex = tabIndexForPath(pathname)
  const activeIndex = Math.max(routeIndex, 0)
  const activeIndexRef = useRef(activeIndex)
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])
  // the scroll container of the tab with sub-pages, where its page stack lives
  const [stackContainer, setStackContainer] = useState<HTMLDivElement | null>(null)
  const backPath = backPathFor(pathname)
  const backPathRef = useRef(backPath)

  // created once: new options make Embla re-init, which jumps and cuts the settle animation
  const [carouselOptions] = useState(() => ({
    startIndex: activeIndex,
    // on a sub-page a sideways swipe means "back", not "next tab"
    watchDrag: (_embla: unknown, event: MouseEvent | TouchEvent) =>
      backPathRef.current === null && !startsInSwipeLock(event),
    duration: SWIPE_SETTLE_DURATION,
  }))
  const [emblaRef, emblaApi] = useEmblaCarousel(carouselOptions)

  useEffect(() => {
    activeIndexRef.current = activeIndex
  }, [activeIndex])

  useEffect(() => {
    backPathRef.current = backPath
  }, [backPath])

  // URL changed (tab tap, link) → jump without animation, like UITabBarController
  useEffect(() => {
    if (emblaApi && emblaApi.selectedScrollSnap() !== activeIndex)
      emblaApi.scrollTo(activeIndex, true)
  }, [emblaApi, activeIndex])

  // Embla moves the pages with transforms, so its clipped viewport must stay at scrollLeft 0.
  // scrollIntoView, focus or iOS restoring the page can still scroll it sideways, leaving
  // a neighbouring (inert, untappable) page in view; undo that immediately.
  useEffect(() => {
    const viewport = emblaApi?.rootNode()
    if (!viewport) return
    const resetSideways = () => {
      if (viewport.scrollLeft !== 0) viewport.scrollLeft = 0
    }
    resetSideways()
    viewport.addEventListener('scroll', resetSideways)
    return () => viewport.removeEventListener('scroll', resetSideways)
  }, [emblaApi])

  // iOS can leave the track between pages (rubber-band pulls past the first or last page,
  // restoring the app from the background); snap it exactly onto the current tab again
  useEffect(() => {
    if (!emblaApi) return
    const realign = () => emblaApi.scrollTo(emblaApi.selectedScrollSnap(), true)
    const realignWhenVisible = () => {
      if (document.visibilityState === 'visible') realign()
    }
    emblaApi.on('settle', realign)
    window.addEventListener('pageshow', realign)
    document.addEventListener('visibilitychange', realignWhenVisible)
    return () => {
      emblaApi.off('settle', realign)
      window.removeEventListener('pageshow', realign)
      document.removeEventListener('visibilitychange', realignWhenVisible)
    }
  }, [emblaApi])

  // a swipe settled on another page → update the URL
  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => {
      const index = emblaApi.selectedScrollSnap()
      const tab = TABS[index]
      if (tab && index !== activeIndexRef.current) navigate(tab.path, { replace: true })
    }
    emblaApi.on('select', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi, navigate])

  if (routeIndex === -1) return <Navigate to={TABS[0].path} replace />

  return (
    <div className="flex h-screen-full flex-col bg-bg text-label">
      <div ref={emblaRef} className="min-h-0 flex-1 overflow-hidden">
        <div className="flex h-full touch-pan-y">
          {TABS.map((tab, index) => {
            const { id, Page } = tab
            const active = index === activeIndex
            const hasSubPages = 'hasSubPages' in tab
            return (
              <div
                key={id}
                data-testid="tab-page"
                ref={(element) => {
                  pageRefs.current[index] = element
                  if (hasSubPages && element) setStackContainer(element)
                }}
                inert={!active}
                aria-hidden={active ? undefined : true}
                className="no-scrollbar stable-paint-layer relative h-full min-w-0 flex-[0_0_100%] overflow-x-hidden overflow-y-auto overscroll-contain"
              >
                {hasSubPages ? (
                  <PageStack
                    path={active ? pathname : tab.path}
                    backPath={active ? backPath : null}
                    animated={active}
                    container={stackContainer}
                    renderPage={() => (
                      <PageFrame>
                        <Page />
                      </PageFrame>
                    )}
                    onBack={(path) => navigate(path, { replace: true })}
                  />
                ) : (
                  <PageFrame>
                    <TabPageContent Page={Page} />
                  </PageFrame>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <SyncStatus />
      <TabBar
        items={TABS}
        activeIndex={activeIndex}
        onSelect={(index) => navigate(TABS[index]?.path ?? TABS[0].path, { replace: true })}
        onReselect={(index) => pageRefs.current[index]?.scrollTo({ top: 0, behavior: 'smooth' })}
      />
    </div>
  )
}
