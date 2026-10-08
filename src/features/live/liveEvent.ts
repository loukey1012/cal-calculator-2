import type { QueryKey } from '@tanstack/react-query'
import { z } from 'zod'
import { dishKey, LEFTOVERS_KEY } from '../dishes/dishChanges'
import { goalKeys } from '../goals/hooks'
import { monthKeys } from '../history/hooks'
import { householdKeys } from '../household/queryKeys'
import { ingredientKeys } from '../ingredients/hooks'
import { dayChangeKey } from '../meals/dayChanges'
import { weightKeys } from '../weight/weightChanges'

const id = z.guid()
// null when no signed-in user made the change (e.g. an admin)
const actor = id.nullable()

/**
 * A hint the database sends on the household's channel when something changed (see the
 * live_updates migration). It names what changed, never the data itself.
 */
const hintSchema = z.discriminatedUnion('table', [
  z.object({ table: z.literal('meals'), user_id: id, date: z.iso.date(), actor }),
  z.object({ table: z.literal('dishes'), dish_id: id, actor }),
  z.object({
    table: z.enum(['ingredients', 'categories', 'category_groups', 'households']),
    actor,
  }),
  z.object({ table: z.enum(['goal_history', 'profiles', 'weight_entries']), user_id: id, actor }),
])

export type LiveHint = z.infer<typeof hintSchema>

/** Messages come from outside the app: anything unexpected is ignored, never trusted. */
export function parseHint(payload: unknown): LiveHint | null {
  const result = hintSchema.safeParse(payload)
  return result.success ? result.data : null
}

/**
 * The cached queries a hint makes out of date. My own changes count too: they may come from my
 * other phone (a refresh waits while this phone's own changes are being saved).
 */
export function keysForHint(hint: LiveHint, householdId: string): readonly QueryKey[] {
  switch (hint.table) {
    case 'meals':
      return [dayChangeKey(hint.user_id, hint.date), monthKeys.person(hint.user_id)]
    case 'dishes':
      return [dishKey(hint.dish_id), LEFTOVERS_KEY]
    case 'ingredients':
    case 'categories':
    case 'category_groups':
      return [
        ingredientKeys.ingredients(householdId),
        ingredientKeys.categories(householdId),
        ingredientKeys.categoryGroups(householdId),
      ]
    case 'goal_history':
      return [goalKeys.goals(hint.user_id)]
    case 'weight_entries':
      return [weightKeys.weights(hint.user_id)]
    case 'profiles':
      return [householdKeys.profile(hint.user_id), householdKeys.members(householdId)]
    case 'households':
      return [householdKeys.household(householdId), householdKeys.members(householdId)]
  }
}
