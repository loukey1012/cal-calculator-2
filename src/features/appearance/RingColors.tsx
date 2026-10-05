import { useState } from 'react'
import { Button } from '../../components/ios/Button'
import { ListRow } from '../../components/ios/ListRow'
import { Sheet } from '../../components/ios/Sheet'
import type { RingKey } from '../nutrition/goals'
import type { CustomGoalColors } from './appearance'
import { SettingSection, SwatchPicker } from './AppearanceOptions'

const GOALS: ReadonlyArray<{ key: RingKey; label: string }> = [
  { key: 'kcal', label: 'Calories' },
  { key: 'protein', label: 'Protein' },
  { key: 'carbs', label: 'Carbs' },
  { key: 'fat', label: 'Fat' },
]

/** Colors that read well as rings and bars on light, pink and dark cards alike. */
const GOAL_SWATCHES = [
  { name: 'Rose', value: '#ff375f' },
  { name: 'Raspberry', value: '#e8457c' },
  { name: 'Pink', value: '#d6409f' },
  { name: 'Red', value: '#e5484d' },
  { name: 'Orange', value: '#ef6c1a' },
  { name: 'Peach', value: '#f0874a' },
  { name: 'Amber', value: '#e8930c' },
  { name: 'Yellow', value: '#f5c400' },
  { name: 'Lime', value: '#8bc34a' },
  { name: 'Green', value: '#1f9d6b' },
  { name: 'Mint', value: '#2fa889' },
  { name: 'Teal', value: '#12a594' },
  { name: 'Cyan', value: '#0797b9' },
  { name: 'Sky', value: '#2f9bd6' },
  { name: 'Blue', value: '#007aff' },
  { name: 'Indigo', value: '#5b5bd6' },
  { name: 'Lavender', value: '#9466d6' },
  { name: 'Violet', value: '#8e4ec6' },
] as const

type RingColorsProps = {
  /** what each ring shows now: the palette color, or the custom one */
  readonly colors: readonly [kcal: string, protein: string, carbs: string, fat: string]
  readonly custom: CustomGoalColors
  readonly onChange: (custom: CustomGoalColors) => void
}

/** One row per goal; tapping it picks that ring's own color. */
export function RingColors({ colors, custom, onChange }: RingColorsProps) {
  const [editing, setEditing] = useState<RingKey | null>(null)
  const goal = GOALS.find(({ key }) => key === editing)

  function pick(key: RingKey, color: string | null) {
    const { [key]: _previous, ...others } = custom
    onChange(color === null ? others : { ...others, [key]: color })
    setEditing(null)
  }

  return (
    <SettingSection
      title="Ring colors"
      footer="Give a goal its own color. Choosing a palette above resets them."
    >
      <ul
        aria-label="Ring colors"
        className="divide-y divide-separator overflow-hidden rounded-3xl bg-bg-elevated shadow-card"
      >
        {GOALS.map(({ key, label }, index) => (
          <li key={key}>
            <ListRow
              title={label}
              leading={
                <span
                  aria-hidden="true"
                  className="h-6 w-6 shrink-0 rounded-full"
                  style={{ backgroundColor: colors[index] }}
                />
              }
              detail={custom[key] ? 'Custom' : 'Palette'}
              onClick={() => setEditing(key)}
            />
          </li>
        ))}
      </ul>
      {goal && (
        <RingColorSheet
          // a fresh draft for every goal
          key={goal.key}
          label={goal.label}
          color={colors[GOALS.indexOf(goal)] ?? GOAL_SWATCHES[0].value}
          isCustom={custom[goal.key] !== undefined}
          onPick={(color) => pick(goal.key, color)}
          onClose={() => setEditing(null)}
        />
      )}
    </SettingSection>
  )
}

type RingColorSheetProps = {
  readonly label: string
  readonly color: string
  readonly isCustom: boolean
  /** a color, or null for the palette color */
  readonly onPick: (color: string | null) => void
  readonly onClose: () => void
}

function RingColorSheet({ label, color, isCustom, onPick, onClose }: RingColorSheetProps) {
  const [draft, setDraft] = useState(color)

  return (
    <Sheet open title={`${label} color`} onClose={onClose}>
      <div className="flex flex-col gap-5 pb-4">
        <SwatchPicker label="Colors" swatches={GOAL_SWATCHES} value={color} onChange={onPick} />
        <div className="flex items-center gap-3 rounded-3xl bg-bg-elevated p-4 shadow-card">
          <input
            id="ring-custom-color"
            type="color"
            aria-label="Custom color"
            value={draft}
            onChange={(event) => setDraft(event.target.value.toLowerCase())}
            className="h-11 w-14 shrink-0 cursor-pointer rounded-xl bg-transparent"
          />
          <Button className="flex-1" onClick={() => onPick(draft)}>
            Use custom color
          </Button>
        </div>
        {isCustom && (
          <Button variant="plain" onClick={() => onPick(null)}>
            Use palette color
          </Button>
        )}
      </div>
    </Sheet>
  )
}
