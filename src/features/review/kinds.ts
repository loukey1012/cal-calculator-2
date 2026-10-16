import type { FindingKind } from './reviewApi'

export const FINDING_KIND_LABELS: Record<FindingKind, string> = {
  typo: 'Typo',
  brand: 'Brand',
  unit_name: 'Unit name',
  unit_weight: 'Unit weight',
  duplicate: 'Duplicate',
  values: 'Values',
  other: 'Other',
  missing_meal: 'Missing meal',
  low_day: 'Low day',
  odd_amount: 'Odd amount',
  double_entry: 'Logged twice',
  zero_kcal: '0 kcal',
}
