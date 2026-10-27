import { useState } from 'react'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { ListRow } from '../../components/ios/ListRow'
import { Sheet } from '../../components/ios/Sheet'
import { OptionCards, SettingSection } from './AppearanceOptions'
import { ColorPicker } from './ColorPicker'
import { OVER_MODES, OVER_PRESET_COLORS, type OverColors, type OverMode } from './overColors'

const MODE_LABELS: Record<OverMode, { label: string; description: string }> = {
  off: { label: 'Off', description: 'Rings keep their color' },
  signal: { label: 'Signal', description: 'Amber, then red' },
  ember: { label: 'Ember', description: 'Orange, then deep red' },
  neon: { label: 'Neon', description: 'Purple, then magenta' },
  custom: { label: 'Custom', description: 'Your own two colors' },
}

type Level = 'full' | 'well'
const LEVEL_LABELS: Record<Level, string> = {
  full: 'More than 10 % over',
  well: 'More than 300 kcal over',
}

function Dot({ color }: { readonly color: string }) {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0_/_0.14)]"
      style={{ backgroundColor: color }}
    />
  )
}

function preview(mode: OverMode, over: OverColors) {
  const pair = mode === 'custom' ? over : mode === 'off' ? null : OVER_PRESET_COLORS[mode]
  return (
    <span className="flex h-4 gap-1">
      {pair ? (
        <>
          <Dot color={pair.full} />
          <Dot color={pair.well} />
        </>
      ) : (
        <span aria-hidden="true" className="h-4 w-4 rounded-full bg-fill" />
      )}
    </span>
  )
}

type OverColorsSectionProps = {
  readonly over: OverColors
  readonly onChange: (over: OverColors) => void
}

/** Appearance › Progress › When over: the colors of calorie rings that are over. */
export function OverColorsSection({ over, onChange }: OverColorsSectionProps) {
  const [editing, setEditing] = useState<Level | null>(null)

  return (
    <SettingSection
      title="When over"
      footer="Only calories change color when over the goal. Up to 10 % over still counts as within the goal; beyond that the first color shows, and more than 300 kcal over the second."
    >
      <OptionCards
        label="When over"
        value={over.mode}
        onChange={(mode) => onChange({ ...over, mode })}
        options={OVER_MODES.map((mode) => ({
          value: mode,
          ...MODE_LABELS[mode],
          preview: preview(mode, over),
        }))}
      />
      {over.mode === 'custom' && (
        <GroupedSection>
          {(['full', 'well'] as const).map((level) => (
            <ListRow
              key={level}
              title={LEVEL_LABELS[level]}
              leading={<Dot color={over[level]} />}
              onClick={() => setEditing(level)}
            />
          ))}
        </GroupedSection>
      )}
      {editing && (
        <Sheet open title={LEVEL_LABELS[editing]} onClose={() => setEditing(null)}>
          <div className="pb-4">
            <ColorPicker
              label={LEVEL_LABELS[editing]}
              value={over[editing]}
              onChange={(color) => {
                onChange({ ...over, [editing]: color })
                setEditing(null)
              }}
            />
          </div>
        </Sheet>
      )}
    </SettingSection>
  )
}
