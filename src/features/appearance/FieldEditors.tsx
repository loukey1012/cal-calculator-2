import { useState } from 'react'
import { Button } from '../../components/ios/Button'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { ListRow } from '../../components/ios/ListRow'
import { Sheet } from '../../components/ios/Sheet'
import { Slider } from '../../components/ios/Slider'
import { ColorPicker } from './ColorPicker'
import { DEFAULT_GLASS_FIELD, MAX_SPOTS, MIN_SPOT_SIZE, MIN_SPOTS, type Spot } from './glassField'

const MAX_PALETTE = 8
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
  return DEFAULT_GLASS_FIELD.palette.find((color) => !used.includes(color)) ?? '#ffffff'
}

type SpotListProps = {
  readonly spots: readonly Spot[]
  readonly onChange: (spots: Spot[]) => void
}

/** Custom: one row per spot (color and size in a sheet), and adding one, up to four. */
export function SpotList({ spots, onChange }: SpotListProps) {
  const [editing, setEditing] = useState<number | null>(null)
  const spot = editing === null ? undefined : spots[editing]
  const replace = (index: number, next: Spot | null) =>
    onChange(spots.flatMap((current, at) => (at !== index ? [current] : next ? [next] : [])))

  return (
    <>
      <GroupedSection footer="Drag a spot in the preview to move it (or select it and use the arrow keys).">
        <ul aria-label="Spots" className="divide-y divide-separator">
          {spots.map((current, index) => (
            <li key={index}>
              <ListRow
                leading={<Swatch color={current.color} />}
                title={`Spot ${index + 1}`}
                detail={`Size ${percent(current.size)}`}
                onClick={() => setEditing(index)}
              />
            </li>
          ))}
        </ul>
        {spots.length < MAX_SPOTS && (
          <ListRow
            title="Add spot"
            onClick={() =>
              onChange([
                ...spots,
                { color: unusedColor(spots.map(({ color }) => color)), x: 0.5, y: 0.5, size: 0.5 },
              ])
            }
          />
        )}
      </GroupedSection>
      {spot && editing !== null && (
        <Sheet open title={`Spot ${editing + 1}`} onClose={() => setEditing(null)}>
          <div className="flex flex-col gap-5 pb-4">
            <ColorPicker
              label="Spot color"
              value={spot.color}
              onChange={(color) => replace(editing, { ...spot, color })}
            />
            <GroupedSection>
              <Slider
                label="Size"
                min={MIN_SPOT_SIZE * 100}
                max={100}
                step={5}
                value={Math.round(spot.size * 100)}
                format={(value) => `${value}%`}
                onChange={(value) => replace(editing, { ...spot, size: value / 100 })}
              />
            </GroupedSection>
            {spots.length > MIN_SPOTS && (
              <Button
                variant="destructive"
                onClick={() => {
                  replace(editing, null)
                  setEditing(null)
                }}
              >
                Remove spot
              </Button>
            )}
          </div>
        </Sheet>
      )}
    </>
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
            {palette.length > MIN_SPOTS && (
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
