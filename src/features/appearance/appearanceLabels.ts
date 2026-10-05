import type {
  AppIcon,
  Appearance,
  CategoryLayout,
  DarkStyle,
  GoalPalette,
  LightStyle,
  ProgressStyle,
} from './appearance'

export const APPEARANCE_PATH = '/settings/appearance'
export const APP_COLORS_PATH = `${APPEARANCE_PATH}/colors`
export const PROGRESS_APPEARANCE_PATH = `${APPEARANCE_PATH}/progress`
export const CATEGORY_CHIPS_APPEARANCE_PATH = `${APPEARANCE_PATH}/category-chips`
export const APP_ICON_PATH = `${APPEARANCE_PATH}/app-icon`

export const THEME_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const

export const LIGHT_STYLE_LABELS: Record<LightStyle, string> = {
  classic: 'Classic',
  pink: 'Pink',
}

// the stored value stays 'bento' so saved choices keep working after the rename
export const DARK_STYLE_LABELS: Record<DarkStyle, string> = {
  soft: 'Soft',
  bento: 'Graphite',
}

export const PROGRESS_OPTIONS: ReadonlyArray<{ value: ProgressStyle; label: string }> = [
  { value: 'rings', label: 'Rings' },
  { value: 'ringBars', label: 'Ring + bars' },
  { value: 'bars', label: 'Bars' },
  { value: 'compact', label: 'Compact' },
]

export const PALETTE_OPTIONS: ReadonlyArray<{ value: GoalPalette; label: string }> = [
  { value: 'vivid', label: 'Vivid' },
  { value: 'pastel', label: 'Pastel' },
  { value: 'accent', label: 'Accent shades' },
  { value: 'contrast', label: 'High contrast' },
]

export const CATEGORY_LAYOUT_OPTIONS: ReadonlyArray<{ value: CategoryLayout; label: string }> = [
  { value: 'line', label: 'One line' },
  { value: 'wrap', label: 'All on screen' },
  { value: 'grouped', label: 'Grouped' },
]

export const APP_ICON_OPTIONS: ReadonlyArray<{ value: AppIcon; label: string }> = [
  { value: 'graphite', label: 'Graphite' },
  { value: 'classic', label: 'Classic' },
  { value: 'pink', label: 'Pink' },
  { value: 'sunset', label: 'Sunset' },
  { value: 'progress', label: 'Progress' },
  { value: 'ember', label: 'Ember' },
  { value: 'leaf', label: 'Leaf' },
  { value: 'violet', label: 'Violet' },
]

function labelOf<T extends string>(
  options: ReadonlyArray<{ value: T; label: string }>,
  value: T,
): string {
  return options.find((option) => option.value === value)?.label ?? value
}

/** e.g. "Light · Pink", "Dark · Graphite" or "System · Classic / Soft" */
export function appColorsSummary({ theme, lightStyle, darkStyle }: Appearance): string {
  const light = LIGHT_STYLE_LABELS[lightStyle]
  const dark = DARK_STYLE_LABELS[darkStyle]
  if (theme === 'light') return `Light · ${light}`
  if (theme === 'dark') return `Dark · ${dark}`
  return `System · ${light} / ${dark}`
}

/** e.g. "Ring + bars · Vivid" */
export function progressSummary({ progressStyle, goalPalette }: Appearance): string {
  return `${labelOf(PROGRESS_OPTIONS, progressStyle)} · ${labelOf(PALETTE_OPTIONS, goalPalette)}`
}

export function categoryChipsSummary({ categoryLayout }: Appearance): string {
  return labelOf(CATEGORY_LAYOUT_OPTIONS, categoryLayout)
}

export function appIconSummary({ appIcon }: Appearance): string {
  return labelOf(APP_ICON_OPTIONS, appIcon)
}
