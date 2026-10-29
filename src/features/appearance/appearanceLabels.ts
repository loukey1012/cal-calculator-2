import {
  activeCustomGoalColors,
  type AppIcon,
  type Appearance,
  type CategoryLayout,
  type DarkStyle,
  type GlassLevel,
  type GoalPalette,
  type LightStyle,
  type ProgressStyle,
} from './appearance'
import {
  DEFAULT_GLASS_FIELD,
  MAX_SPOTS,
  MIN_SPOTS,
  type ColorMode,
  type FieldChange,
  type FieldPreset,
  type GlassField,
  type MoveSpeed,
  type PositionMode,
} from './glassField'

export const APPEARANCE_PATH = '/settings/appearance'
export const APP_COLORS_PATH = `${APPEARANCE_PATH}/colors`
export const PROGRESS_APPEARANCE_PATH = `${APPEARANCE_PATH}/progress`
export const CATEGORY_CHIPS_APPEARANCE_PATH = `${APPEARANCE_PATH}/category-chips`
export const APP_ICON_PATH = `${APPEARANCE_PATH}/app-icon`
export const BACKGROUND_APPEARANCE_PATH = `${APPEARANCE_PATH}/background`

export const THEME_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const

export const SPOT_COUNT_OPTIONS = Array.from({ length: MAX_SPOTS - MIN_SPOTS + 1 }, (_, index) =>
  String(MIN_SPOTS + index),
).map((value) => ({ value, label: value }))

export const POSITION_OPTIONS: ReadonlyArray<{ value: PositionMode; label: string }> = [
  { value: 'specified', label: 'Specified' },
  { value: 'random', label: 'Random' },
  { value: 'moving', label: 'Moving' },
]

export const SPEED_OPTIONS: ReadonlyArray<{ value: MoveSpeed; label: string }> = [
  { value: 'slow', label: 'Slow' },
  { value: 'medium', label: 'Medium' },
  { value: 'fast', label: 'Fast' },
]

export const COLOR_MODE_OPTIONS: ReadonlyArray<{ value: ColorMode; label: string }> = [
  { value: 'custom', label: 'Custom' },
  { value: 'preset', label: 'Preset' },
  { value: 'cycle', label: 'Cycle' },
  { value: 'random', label: 'Random' },
]

export const FIELD_PRESET_LABELS: Record<FieldPreset, string> = {
  style: 'Style',
  sunset: 'Sunset',
  ocean: 'Ocean',
  forest: 'Forest',
  candy: 'Candy',
}

export const FIELD_CHANGE_OPTIONS: ReadonlyArray<{ value: FieldChange; label: string }> = [
  { value: 'tab', label: 'Every tab change' },
  { value: 'start', label: 'Once per app start' },
]

const POSITION_SUMMARIES: Record<PositionMode, string | null> = {
  specified: null,
  random: 'Random places',
  moving: 'Moving',
}

const COLOR_SUMMARIES: Record<Exclude<ColorMode, 'preset'>, string> = {
  custom: 'Custom colors',
  cycle: 'Cycle',
  random: 'Random colors',
}

function colorsSummary({ mode, preset }: GlassField['colors']): string {
  if (mode !== 'preset') return COLOR_SUMMARIES[mode]
  return preset === 'style' ? 'Style colors' : FIELD_PRESET_LABELS[preset]
}

/** e.g. "4 spots · Moving · Ocean" */
export function backgroundSummary(appearance: Appearance): string {
  const field = appearance.glassField ?? DEFAULT_GLASS_FIELD
  const spots = field.count === 1 ? '1 spot' : `${field.count} spots`
  return [spots, POSITION_SUMMARIES[field.position.mode], colorsSummary(field.colors)]
    .filter(Boolean)
    .join(' · ')
}

export const GLASS_OPTIONS: ReadonlyArray<{ value: GlassLevel; label: string }> = [
  { value: 'off', label: 'Off' },
  // stored values stay 'controls' and 'all' so saved choices keep working after the rename
  { value: 'controls', label: 'Minimal' },
  { value: 'all', label: 'Full' },
]

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
export function progressSummary(appearance: Appearance): string {
  const { progressStyle, goalPalette } = appearance
  const colors =
    Object.keys(activeCustomGoalColors(appearance)).length > 0
      ? 'Custom'
      : labelOf(PALETTE_OPTIONS, goalPalette)
  return `${labelOf(PROGRESS_OPTIONS, progressStyle)} · ${colors}`
}

export function categoryChipsSummary({ categoryLayout }: Appearance): string {
  return labelOf(CATEGORY_LAYOUT_OPTIONS, categoryLayout)
}

export function appIconSummary({ appIcon }: Appearance): string {
  return labelOf(APP_ICON_OPTIONS, appIcon)
}
