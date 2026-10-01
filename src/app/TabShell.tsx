import useEmblaCarousel from 'embla-carousel-react'
import { memo, useEffect, useRef, type ComponentType } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { HistoryIcon, IngredientsIcon, SettingsIcon, TodayIcon } from '../components/ios/icons'
import { TabBar } from '../components/ios/TabBar'
import { HistoryPage } from '../features/history/HistoryPage'
import { IngredientsPage } from '../features/ingredients/IngredientsPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { TodayPage } from '../features/today/TodayPage'
import { useCurrentUser } from './currentUser'
import { useAccentColor } from './useAccentColor'

const TABS = [
  { id: 'today', label: 'Today', path: '/today', icon: <TodayIcon />, Page: TodayPage },
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
  },
] as const

// Embla's scroll speed for swipes (higher = slower settle)
const SWIPE_SETTLE_DURATION = 22

// switching tabs replaces the history entry: like UITabBarController, tabs build no back stack

/** Pages only re-render for their own data, not when the active tab changes mid-swipe. */
const TabPageContent = memo(function TabPageContent({ Page }: { readonly Page: ComponentType }) {
  return <Page />
})

function tabIndexForPath(pathname: string): number {
  return TABS.findIndex((tab) => pathname === tab.path || pathname.startsWith(`${tab.path}/`))
}

/** Lets horizontal gestures that start inside `[data-swipe-lock]` (e.g. chip scrollers) stay local. */
function allowTabSwipe(_embla: unknown, event: MouseEvent | TouchEvent): boolean {
  return !(event.target instanceof Element && event.target.closest('[data-swipe-lock]'))
}

/** The signed-in app: four pages side by side, switched by the tab bar or by swiping. */
export function TabShell() {
  const { profile } = useCurrentUser()
  useAccentColor(profile.accent_color)

  const { pathname } = useLocation()
  const navigate = useNavigate()
  const routeIndex = tabIndexForPath(pathname)
  const activeIndex = Math.max(routeIndex, 0)
  const activeIndexRef = useRef(activeIndex)
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])

  const [emblaRef, emblaApi] = useEmblaCarousel({
    startIndex: activeIndex,
    watchDrag: allowTabSwipe,
    duration: SWIPE_SETTLE_DURATION,
  })

  useEffect(() => {
    activeIndexRef.current = activeIndex
  }, [activeIndex])

  // URL changed (tab tap, link) → jump without animation, like UITabBarController
  useEffect(() => {
    if (emblaApi && emblaApi.selectedScrollSnap() !== activeIndex)
      emblaApi.scrollTo(activeIndex, true)
  }, [emblaApi, activeIndex])

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
    <div className="flex h-dvh flex-col bg-bg text-label">
      <div ref={emblaRef} className="min-h-0 flex-1 overflow-hidden">
        <div className="flex h-full touch-pan-y">
          {TABS.map(({ id, Page }, index) => {
            const active = index === activeIndex
            return (
              <div
                key={id}
                data-testid="tab-page"
                ref={(element) => {
                  pageRefs.current[index] = element
                }}
                inert={!active}
                aria-hidden={active ? undefined : true}
                className="h-full min-w-0 flex-[0_0_100%] overflow-y-auto overscroll-contain pt-safe-top pb-tabbar"
              >
                <div className="mx-auto max-w-md px-4">
                  <TabPageContent Page={Page} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <TabBar
        items={TABS}
        activeIndex={activeIndex}
        onSelect={(index) => navigate(TABS[index]?.path ?? TABS[0].path, { replace: true })}
        onReselect={(index) => pageRefs.current[index]?.scrollTo({ top: 0, behavior: 'smooth' })}
      />
    </div>
  )
}
