import { screen } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'

/** In tests: picks the ingredient form's category, broad category first (by option value). */
export async function pickCategory(
  user: UserEvent,
  groupId: string,
  categoryId: string,
): Promise<void> {
  await user.selectOptions(screen.getByLabelText('Broad category'), groupId)
  await user.selectOptions(screen.getByLabelText('Category'), categoryId)
}
