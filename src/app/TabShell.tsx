import useEmblaCarousel from 'embla-carousel-react'
import {
  memo,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ComponentType,
  type ReactNode,
} from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { HistoryIcon, IngredientsIcon, SettingsIcon, TodayIcon } from '../components/ios/icons'
import { TabBar } from '../components/ios/TabBar'
import { CookSession } from '../features/cook/CookSession'
import { useLegacyCookTarget } from '../features/cook/legacyCookLink'
import { HistoryPage } from '../features/history/HistoryPage'
import { IngredientsPage } from '../features/ingredients/IngredientsPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { TodayPage } from '../features/today/TodayPage'
import { parseAppearance } from '../features/appearance/appearance'
import { useGlassField } from '../features/appearance/useGlassField'
import { useCurrentUser } from './currentUser'
import { useResumeOfflineChanges, useSaveWhenHidden } from './offlineLifecycle'
import { PageStack } from './PageStack'
import { useStackNavigate } from './stackNavigate'
import { startsAtBottomEdge } from './stackMotion'
import { SyncStatus } from './SyncStatus'
import { wasUpdatedThisStart } from './appVersion'
import { updateReady } from './updateReady'
import { UpdateToasts } from './UpdateToasts'
import { useAppearance } from '../features/appearance/useAppearance'
import { useLiveUpdates } from '../features/live/useLiveUpdates'

// Every tab is a stack of pages: a meal (and its Add food steps) opens on top of Today or of a
// History day, a recipe on top of Ingredients › Recipes, Appearance etc. on top of Settings.
// `roots` are the tab's own pages: switching between them moves nothing, a swipe there
// switches tabs.
const TABS = [
  {
    id: 'today',
    label: 'Today',
    path: '/today',
    icon: <TodayIcon />,
    Page: TodayPage,
    roots: /^\/today$/,
  },
  {
    id: 'history',
    label: 'History',
    path: '/history',
    icon: <HistoryIcon />,
    Page: HistoryPage,
    // the month, with a day picked or not
    roots: /^\/history(\/\d{4}-\d{2}-\d{2})?$/,
  },
  {
    id: 'ingredients',
    label: 'Ingredients',
    path: '/ingredients',
    icon: <IngredientsIcon />,
    Page: IngredientsPage,
    roots: /^\/ingredients(\/recipes)?$/,
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: <SettingsIcon />,
    Page: SettingsPage,
    roots: /^\/settings$/,
  },
] as const

// Embla's scroll speed for swipes (higher = slower settle)
const SWIPE_SETTLE_DURATION = 22

// switching tabs replaces the history entry: like UITabBarController, tabs build no back stack

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

/** iOS's own swipes start at the bottom edge (switching apps): they never switch tabs. */
function startsAtBottom(event: MouseEvent | TouchEvent): boolean {
  const y = 'touches' in event ? event.touches[0]?.clientY : event.clientY
  return y !== undefined && startsAtBottomEdge(y, window.innerHeight)
}

/** Lets horizontal gestures that start inside `[data-swipe-lock]` (e.g. chip scrollers) stay local. */
function startsInSwipeLock(event: MouseEvent | TouchEvent): boolean {
  return event.target instanceof Element && event.target.closest('[data-swipe-lock]') !== null
}

function isRootPath(pathname: string): boolean {
  return TABS.some((tab) => tab.roots.test(pathname))
}

/**
 * On a page opened on top (e.g. a meal, Settings › Appearance) the page one level up a back
 * swipe leads to, otherwise null.
 */
function backPathFor(pathname: string): string | null {
  const trimmed = pathname.replace(/\/+$/, '')
  if (isRootPath(trimmed)) return null
  return trimmed.replace(/\/[^/]*$/, '')
}

/** The tabs; the dish being added lives above them, so any meal's Add food finds it. */
export function TabShell() {
  return (
    <CookSession>
      <ShellContent />
    </CookSession>
  )
}

type TabStackProps = Omit<ComponentProps<typeof PageStack>, 'renderPage' | 'isRoot'> & {
  readonly Page: ComponentType
}

/** A tab's pages; only re-rendered for its own changes, not when another tab becomes active. */
const TabStack = memo(function TabStack({ Page, onBack, ...stack }: TabStackProps) {
  return (
    <PageStack
      {...stack}
      isRoot={isRootPath}
      renderPage={() => (
        <PageFrame>
          <Page />
        </PageFrame>
      )}
      onBack={onBack}
    />
  )
})

function ShellContent() {
  const { profile, householdId } = useCurrentUser()
  useAppearance(profile)
  useResumeOfflineChanges()
  useSaveWhenHidden()
  useLiveUpdates(householdId)

  const { pathname } = useLocation()
  const navigate = useNavigate()
  const legacyCookTarget = useLegacyCookTarget()
  // a swipe back keeps the navigation state (whose meal it is), like Back on the page does
  const stackNavigate = useStackNavigate()
  const stackNavigateRef = useRef(stackNavigate)
  useEffect(() => {
    stackNavigateRef.current = stackNavigate
  })
  const [goBack] = useState(() => (path: string) => stackNavigateRef.current(path))
  const routeIndex = tabIndexForPath(pathname)
  const activeIndex = Math.max(routeIndex, 0)
  // the color background behind Liquid Glass Full, new colors on tab changes if chosen
  useGlassField(parseAppearance(profile.appearance), activeIndex)
  const activeIndexRef = useRef(activeIndex)
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])
  // the scroll containers of the tabs with sub-pages, where their page stacks live
  const [stackContainers, setStackContainers] = useState<Readonly<Record<string, HTMLDivElement>>>(
    {},
  )
  const backPath = backPathFor(pathname)
  const backPathRef = useRef(backPath)

  // created once: new options make Embla re-init, which jumps and cuts the settle animation
  const [carouselOptions] = useState(() => ({
    startIndex: activeIndex,
    // on a sub-page a sideways swipe means "back", not "next tab"
    watchDrag: (_embla: unknown, event: MouseEvent | TouchEvent) =>
      backPathRef.current === null && !startsInSwipeLock(event) && !startsAtBottom(event),
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

  // the Cook tab of older versions (links in notifications): to that meal's Add food
  if (legacyCookTarget) return <Navigate to={legacyCookTarget} replace />
  if (routeIndex === -1) return <Navigate to={TABS[0].path} replace />

  return (
    <div className="glass-field flex h-screen-full flex-col bg-bg text-label">
      <div ref={emblaRef} className="min-h-0 flex-1 overflow-hidden">
        <div className="flex h-full touch-pan-y">
          {TABS.map((tab, index) => {
            const { id, Page } = tab
            const active = index === activeIndex
            const container = stackContainers[id] ?? null
            return (
              <div
                key={id}
                data-testid="tab-page"
                ref={(element) => {
                  pageRefs.current[index] = element
                  if (element && stackContainers[id] !== element) {
                    setStackContainers((current) => ({ ...current, [id]: element }))
                  }
                }}
                inert={!active}
                aria-hidden={active ? undefined : true}
                className="no-scrollbar stable-paint-layer relative h-full min-w-0 flex-[0_0_100%] overflow-x-hidden overflow-y-auto overscroll-contain"
              >
                <TabStack
                  path={active ? pathname : tab.path}
                  backPath={active ? backPath : null}
                  animated={active}
                  container={container}
                  Page={Page}
                  onBack={goBack}
                />
              </div>
            )
          })}
        </div>
      </div>
      <SyncStatus />
      <UpdateToasts updatedThisStart={wasUpdatedThisStart()} update={updateReady} />
      <TabBar
        items={TABS}
        activeIndex={activeIndex}
        onSelect={(index) => navigate(TABS[index]?.path ?? TABS[0].path, { replace: true })}
        onReselect={(index) => pageRefs.current[index]?.scrollTo({ top: 0, behavior: 'smooth' })}
      />
    </div>
  )
}
