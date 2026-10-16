import type { Finding } from './reviewApi'

const EMPTY_FINDING: Finding = {
  id: 'f0',
  household_id: 'h1',
  ingredient_id: 'i1',
  user_id: null,
  date: null,
  meal_type: null,
  meal_item_id: null,
  kind: 'typo',
  message: 'The name looks misspelled.',
  suggestion: { name: 'Butter' },
  status: 'open',
  run_id: 'run-1',
  created_at: '2026-10-16T08:00:00Z',
  decided_by: null,
  decided_at: null,
}

export function finding(overrides: Partial<Finding>): Finding {
  return { ...EMPTY_FINDING, ...overrides }
}
