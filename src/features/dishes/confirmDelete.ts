export const DELETE_SHARED_QUESTION =
  'This dish has other portions too. Deleting it removes it from every meal and its leftovers.'

/** A dish with more than one portion (or an unknown number) is only deleted after asking. */
export function confirmDeleteDish(portionCount: number | undefined): boolean {
  return portionCount === 1 || window.confirm(DELETE_SHARED_QUESTION)
}
