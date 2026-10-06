import type { Profile } from '../household/householdApi'
import { isLeftover, type Dish } from './portions'

/** "Lukas", "Leftover" (or "Leftover 2" when there are several), "Thrown away" */
export function portionName(
  dish: Dish,
  people: readonly Profile[],
  nameOfPerson: (person: Profile) => string,
  portionId: string,
): string {
  const portion = dish.portions.find((candidate) => candidate.id === portionId)
  if (portion?.eater) {
    const person = people.find((candidate) => candidate.id === portion.eater?.userId)
    return person ? nameOfPerson(person) : 'Someone else'
  }
  if (portion?.discarded) return 'Thrown away'
  const leftovers = dish.portions.filter(isLeftover)
  const index = leftovers.findIndex((candidate) => candidate.id === portionId)
  return leftovers.length > 1 ? `Leftover ${index + 1}` : 'Leftover'
}
