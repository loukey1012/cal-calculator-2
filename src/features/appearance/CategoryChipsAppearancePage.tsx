import { SegmentedControl } from '../../components/ios/SegmentedControl'
import { APPEARANCE_PATH, CATEGORY_LAYOUT_OPTIONS } from './appearanceLabels'
import { SettingSection } from './AppearanceOptions'
import { AppearanceSubPage } from './AppearanceSubPage'
import { CategoryChipsPreview } from './CategoryChipsPreview'
import { useAppearanceSettings } from './useAppearanceSettings'

/** Settings › Appearance › Category chips: the category filter on the Ingredients page. */
export function CategoryChipsAppearancePage() {
  const { appearance, update, change } = useAppearanceSettings()

  return (
    <AppearanceSubPage
      title="Category chips"
      back={{ path: APPEARANCE_PATH, label: 'Appearance' }}
      saveError={update.error}
    >
      <SettingSection
        title="Layout"
        footer="How the category filter on the Ingredients page is laid out."
      >
        <CategoryChipsPreview layout={appearance.categoryLayout} />
        <SegmentedControl
          label="Category chips"
          options={CATEGORY_LAYOUT_OPTIONS}
          value={appearance.categoryLayout}
          onChange={(layout) => change('categoryLayout', layout)}
        />
      </SettingSection>
    </AppearanceSubPage>
  )
}
