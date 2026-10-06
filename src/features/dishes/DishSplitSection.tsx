import { GroupedSection } from '../../components/ios/GroupedSection'
import { SegmentedControl } from '../../components/ios/SegmentedControl'
import { DecimalRow } from './DecimalRow'
import { withCookedWeight, withSplitMode, withSplitValue } from './dishDraft'
import type { Dish, SplitMode } from './portions'

const SPLIT_OPTIONS: ReadonlyArray<{ readonly value: SplitMode; readonly label: string }> = [
  { value: 'equal', label: 'Equal' },
  { value: 'count', label: 'Count' },
  { value: 'percent', label: '%' },
  { value: 'weight', label: 'Weight' },
]

const SPLIT_INPUT: Record<
  Exclude<SplitMode, 'equal'>,
  { readonly noun: string; readonly suffix?: string; readonly footer: string }
> = {
  count: { noun: 'count', footer: 'E.g. toasts or servings each person had.' },
  percent: { noun: 'percent', suffix: '%', footer: 'What is left over is logged for nobody.' },
  weight: {
    noun: 'plate weight',
    suffix: 'g',
    footer: 'Weigh the whole cooked dish, then each plate.',
  },
}

type DishSplitSectionProps = {
  readonly dish: Dish
  /** e.g. "Lukas", "Leftover" */
  readonly nameOf: (portionId: string) => string
  readonly onChange: (dish: Dish) => void
}

/** How the shared ingredients are divided; only shown with more than one portion. */
export function DishSplitSection({ dish, nameOf, onChange }: DishSplitSectionProps) {
  const splitInput = dish.splitMode === 'equal' ? null : SPLIT_INPUT[dish.splitMode]
  if (dish.portions.length < 2) return null

  return (
    <section className="mt-6">
      <h2 className="caption px-4 pb-2">Split</h2>
      <SegmentedControl
        label="Split"
        options={SPLIT_OPTIONS}
        value={dish.splitMode}
        onChange={(mode) => onChange(withSplitMode(dish, mode))}
      />
      {splitInput && (
        <GroupedSection footer={splitInput.footer}>
          {dish.splitMode === 'weight' && (
            <DecimalRow
              label="Cooked dish"
              accessibleLabel="Cooked dish weight"
              suffix="g"
              value={dish.cookedWeightG}
              onChange={(value) => onChange(withCookedWeight(dish, value))}
            />
          )}
          {dish.portions.map((portion) => (
            <DecimalRow
              // a new split starts from new values
              key={`${dish.splitMode}:${portion.id}`}
              label={nameOf(portion.id)}
              accessibleLabel={`${nameOf(portion.id)} ${splitInput.noun}`}
              suffix={splitInput.suffix}
              value={portion.splitValue}
              onChange={(value) => onChange(withSplitValue(dish, portion.id, value))}
            />
          ))}
        </GroupedSection>
      )}
    </section>
  )
}
