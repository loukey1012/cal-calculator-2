import { useState } from 'react'
import { Button } from '../../components/ios/Button'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { ListRow } from '../../components/ios/ListRow'
import { Sheet } from '../../components/ios/Sheet'
import { Slider } from '../../components/ios/Slider'
import { ColorPicker } from './ColorPicker'
import { FIELD_PRESET_LABELS } from './appearanceLabels'
import { OptionCards } from './AppearanceOptions'
import {
  DEFAULT_GLASS_FIELD,
  FIELD_PRESETS,
  MAX_PALETTE,
  MIN_PALETTE,
  MIN_SPOT_SIZE,
  PAINTED_RING,
  presetColors,
  type FieldPreset,
  type Spot,
} from './glassField'

const percent = (share: number) => `${Math.round(share * 100)}%`

function Swatch({ color }: { readonly color: string }) {
  return (
    <span
      aria-hidden="true"
      className="h-6 w-6 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0_/_0.14)]"
      style={{ backgroundColor: color }}
    />
  )
}

/** A color for something new: the first default one not used yet. */
function unusedColor(used: readonly string[]): string {
  return DEFAULT_GLASS_FIELD.colors.palette.find((color) => !used.includes(color)) ?? '#ffffff'
}

type SpotListProps = {
  /** the spots in use, as saved */
  readonly spots: readonly Spot[]
  /** the colors they show now (from the chosen colors) */
  readonly shownColors: readonly string[]
  /** with Colors › Custom each spot's color is picked here too */
  readonly customColors: boolean
  readonly onChange: (index: number, spot: Spot) => void
}

/** One row per spot in use; its sheet sets the size, and the color with Custom colors. */
export function SpotList({ spots, shownColors, customColors, onChange }: SpotListProps) {
  const [editing, setEditing] = useState<number | null>(null)
  const spot = editing === null ? undefined : spots[editing]

  return (
    <>
      <GroupedSection>
        <ul aria-label="Spot list" className="divide-y divide-separator">
          {spots.map((current, index) => (
            <li key={index}>
              <ListRow
                leading={<Swatch color={shownColors[index] ?? current.color} />}
                title={`Spot ${index + 1}`}
                detail={`Size ${percent(current.size)}`}
                onClick={() => setEditing(index)}
              />
            </li>
          ))}
        </ul>
      </GroupedSection>
      {spot && editing !== null && (
        <Sheet open title={`Spot ${editing + 1}`} onClose={() => setEditing(null)}>
          <div className="flex flex-col gap-5 pb-4">
            {customColors && (
              <ColorPicker
                label="Spot color"
                value={spot.color}
                onChange={(color) => onChange(editing, { ...spot, color })}
              />
            )}
            <GroupedSection>
              <Slider
                label="Size"
                min={MIN_SPOT_SIZE * 100}
                max={100}
                step={5}
                value={Math.round(spot.size * 100)}
                format={(value) => `${value}%`}
                onChange={(value) => onChange(editing, { ...spot, size: value / 100 })}
              />
            </GroupedSection>
          </div>
        </Sheet>
      )}
    </>
  )
}

type PresetCardsProps = {
  readonly value: FieldPreset
  readonly onChange: (preset: FieldPreset) => void
}

/** Colors › Preset: each palette as a card with its colors. */
export function PresetCards({ value, onChange }: PresetCardsProps) {
  return (
    <OptionCards
      label="Preset"
      value={value}
      onChange={onChange}
      options={FIELD_PRESETS.map((preset) => ({
        value: preset,
        label: FIELD_PRESET_LABELS[preset],
        preview: (
          <span className="flex gap-1">
            {presetColors(preset, PAINTED_RING).map((color) => (
              <Swatch key={color} color={color} />
            ))}
          </span>
        ),
      }))}
    />
  )
}

type PaletteListProps = {
  readonly palette: readonly string[]
  readonly onChange: (palette: string[]) => void
}

/** Cycle: the colors it moves through, each changeable in a sheet; two to eight. */
export function PaletteList({ palette, onChange }: PaletteListProps) {
  const [editing, setEditing] = useState<number | null>(null)
  const color = editing === null ? undefined : palette[editing]
  const replace = (index: number, next: string | null) =>
    onChange(palette.flatMap((current, at) => (at !== index ? [current] : next ? [next] : [])))

  return (
    <>
      <GroupedSection footer="Each change shows the next colors of this list.">
        <div className="flex flex-wrap gap-3 px-4 py-3">
          {palette.map((current, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Color ${index + 1}`}
              onClick={() => setEditing(index)}
              className="h-10 w-10 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0_/_0.14)]"
              style={{ backgroundColor: current }}
            />
          ))}
        </div>
        {palette.length < MAX_PALETTE && (
          <ListRow title="Add color" onClick={() => onChange([...palette, unusedColor(palette)])} />
        )}
      </GroupedSection>
      {color !== undefined && editing !== null && (
        <Sheet open title={`Color ${editing + 1}`} onClose={() => setEditing(null)}>
          <div className="flex flex-col gap-5 pb-4">
            <ColorPicker
              label="Cycle color"
              value={color}
              onChange={(next) => replace(editing, next)}
            />
            {palette.length > MIN_PALETTE && (
              <Button
                variant="destructive"
                onClick={() => {
                  replace(editing, null)
                  setEditing(null)
                }}
              >
                Remove color
              </Button>
            )}
          </div>
        </Sheet>
      )}
    </>
  )
}
