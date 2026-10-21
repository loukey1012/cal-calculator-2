import { useState, type ReactNode } from 'react'
import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { ToggleRow } from '../../components/ios/FormRows'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { ListRow } from '../../components/ios/ListRow'
import { TextField } from '../../components/ios/TextField'
import { parseDecimal } from '../../lib/numbers'
import { amountSuffix } from '../nutrition/unitNames'
import type { ComposerSteps } from './composerSteps'
import { DishSplitSection } from './DishSplitSection'
import { DishTotals } from './DishTotals'
import {
  describeLine,
  lineWho,
  rescaledLine,
  withKcalEstimated,
  withLine,
  withName,
} from './dishDraft'
import { LeftoverStepper } from './LeftoverStepper'
import type { Dish, DishLine } from './portions'

type CompactDishProps = {
  readonly dish: Dish
  readonly onChange: (dish: Dish) => void
  readonly nameOf: (portionId: string) => string
  /** who ate it (and when), shown with the split */
  readonly whoEats: ReactNode
  /** e.g. "Mince is marked as an estimate." */
  readonly estimateNote: string | null
  readonly actions: ReactNode
  readonly error: string | null
  readonly steps: ComposerSteps
}

type AmountLineProps = {
  readonly line: DishLine
  readonly nameOf: (portionId: string) => string
  readonly onAmount: (line: DishLine) => void
  /** the whole line: who has it, amounts per person, swap, remove */
  readonly onOpen: () => void
}

/** An ingredient with its amount to change right here; one with own amounts per person opens. */
function AmountLine({ line, nameOf, onAmount, onOpen }: AmountLineProps) {
  const who = lineWho(line)
  const [text, setText] = useState(String(line.item.entered_amount))
  const subtitle = describeLine(line, nameOf).replace(/^[^·]*· /, '')
  const opener = (
    <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
      <span className="block text-[16px] font-bold">{line.item.name}</span>
      <span className="block text-[13px] text-label-secondary">
        {who.kind === 'own' ? describeLine(line, nameOf) : subtitle}
      </span>
    </button>
  )
  if (who.kind === 'own') {
    return <div className="flex items-center gap-3 px-4 py-3">{opener}</div>
  }
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {opener}
      <input
        aria-label={`${line.item.name}, amount`}
        inputMode="decimal"
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          const amount = parseDecimal(event.target.value)
          if (amount === null || amount <= 0) return
          onAmount(
            who.kind === 'shared'
              ? rescaledLine(line, { allocation: 'shared', amount })
              : rescaledLine(line, {
                  allocation: 'per_portion',
                  amounts: { [who.portionId]: amount },
                }),
          )
        }}
        className="w-20 rounded-lg bg-fill px-2 py-1.5 text-right text-[16px] font-bold outline-none"
      />
      <span className="w-12 text-[15px] font-semibold text-label-secondary">
        {amountSuffix(line.item.entered_unit)}
      </span>
    </div>
  )
}

/** A row that shows more below it when tapped. */
function Disclosure({
  title,
  detail,
  children,
}: {
  readonly title: string
  readonly detail?: string
  readonly children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <GroupedSection>
        <ListRow
          title={title}
          detail={detail ?? (open ? 'Hide' : 'Show')}
          onClick={() => setOpen(!open)}
        />
      </GroupedSection>
      {open && children}
    </>
  )
}

/**
 * A logged dish, compact: what everyone got, its ingredients with their amounts to change in
 * place, and the rest (who ate it, split, name, leftovers, estimate) only when opened.
 */
export function CompactDish({
  dish,
  onChange,
  nameOf,
  whoEats,
  estimateNote,
  actions,
  error,
  steps,
}: CompactDishProps) {
  return (
    <>
      {dish.lines.length > 0 && <DishTotals dish={dish} nameOf={nameOf} />}
      <GroupedSection header="Ingredients">
        {dish.lines.map((line) => (
          <AmountLine
            key={line.id}
            line={line}
            nameOf={nameOf}
            onAmount={(changed) => onChange(withLine(dish, changed))}
            onOpen={() => steps.open({ kind: 'editLine', lineId: line.id })}
          />
        ))}
        <div className="px-2 py-1">
          <Button variant="plain" onClick={() => steps.open({ kind: 'pick' })}>
            + Add ingredient
          </Button>
        </div>
      </GroupedSection>
      <Disclosure title="Who ate it, split">
        {whoEats}
        <DishSplitSection dish={dish} nameOf={nameOf} onChange={onChange} />
      </Disclosure>
      <Disclosure title="Name, leftovers, estimate" detail={dish.name ?? undefined}>
        <GroupedSection>
          <TextField
            label="Dish name (optional)"
            defaultValue={dish.name ?? ''}
            onChange={(event) => onChange(withName(dish, event.target.value))}
          />
          <ToggleRow
            label="Calories are an estimate"
            checked={dish.kcalEstimated ?? false}
            onChange={(estimated) => onChange(withKcalEstimated(dish, estimated))}
          />
          {estimateNote && (
            <p className="px-4 pb-3 text-[13px] text-label-secondary">{estimateNote}</p>
          )}
          <LeftoverStepper dish={dish} onChange={onChange} />
        </GroupedSection>
      </Disclosure>
      {error && <ErrorBanner message={error} />}
      <div className="mt-6 flex flex-col gap-3">{actions}</div>
    </>
  )
}
