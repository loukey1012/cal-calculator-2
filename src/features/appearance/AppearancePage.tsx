import { useLocation, useNavigate } from 'react-router'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { ListRow } from '../../components/ios/ListRow'
import { AppColorsPage } from './AppColorsPage'
import {
  APP_COLORS_PATH,
  appColorsSummary,
  CATEGORY_CHIPS_APPEARANCE_PATH,
  categoryChipsSummary,
  PROGRESS_APPEARANCE_PATH,
  progressSummary,
} from './appearanceLabels'
import { AppearanceSubPage } from './AppearanceSubPage'
import { CategoryChipsAppearancePage } from './CategoryChipsAppearancePage'
import { ProgressAppearancePage } from './ProgressAppearancePage'
import { useAppearanceSettings } from './useAppearanceSettings'

/** Settings › Appearance, or one of its pages; anything unknown shows the menu. */
export function AppearancePage() {
  const { pathname } = useLocation()
  if (pathname === APP_COLORS_PATH) return <AppColorsPage />
  if (pathname === PROGRESS_APPEARANCE_PATH) return <ProgressAppearancePage />
  if (pathname === CATEGORY_CHIPS_APPEARANCE_PATH) return <CategoryChipsAppearancePage />
  return <AppearanceMenu />
}

/** How the app looks for you, saved to your account, split into three pages. */
function AppearanceMenu() {
  const navigate = useNavigate()
  const { appearance, update } = useAppearanceSettings()
  const open = (path: string) => navigate(path, { replace: true })

  return (
    <AppearanceSubPage
      title="Appearance"
      back={{ path: '/settings', label: 'Settings' }}
      saveError={update.error}
    >
      <p className="text-[14px] font-medium text-label-secondary">
        Saved to your account, so every device looks the same.
      </p>
      <GroupedSection>
        <ListRow
          title="App colors"
          detail={appColorsSummary(appearance)}
          onClick={() => open(APP_COLORS_PATH)}
        />
        <ListRow
          title="Progress"
          detail={progressSummary(appearance)}
          onClick={() => open(PROGRESS_APPEARANCE_PATH)}
        />
        <ListRow
          title="Category chips"
          detail={categoryChipsSummary(appearance)}
          onClick={() => open(CATEGORY_CHIPS_APPEARANCE_PATH)}
        />
      </GroupedSection>
    </AppearanceSubPage>
  )
}
