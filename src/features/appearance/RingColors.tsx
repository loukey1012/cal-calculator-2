import { useState } from 'react'
import { Button } from '../../components/ios/Button'
import { ListRow } from '../../components/ios/ListRow'
import { Sheet } from '../../components/ios/Sheet'
import type { RingKey } from '../nutrition/goals'
import type { CustomGoalColors } from './appearance'
import { SettingSection } from './AppearanceOptions'
import { ColorPicker } from './ColorPicker'
import { COLOR_PRESETS } from './colorPresets'

const GOALS: ReadonlyArray<{ key: RingKey; label: string }> = [
  { key: 'kcal', label: 'Calories' },
  { key: 'protein', label: 'Protein' },
  { key: 'carbs', label: 'Carbs' },
  { key: 'fat', label: 'Fat' },
]

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
          // one sheet per goal
          key={goal.key}
          label={goal.label}
          color={colors[GOALS.indexOf(goal)] ?? COLOR_PRESETS[0].value}
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
  return (
    <Sheet open title={`${label} color`} onClose={onClose}>
      <div className="flex flex-col gap-5 pb-4">
        <ColorPicker label="Colors" value={color} onChange={onPick} />
        {isCustom && (
          <Button variant="plain" onClick={() => onPick(null)}>
            Use palette color
          </Button>
        )}
      </div>
    </Sheet>
  )
}
