import { ApiError } from '../../lib/errors'
import { supabase } from '../../lib/supabase'
import { hasContent, type AddFoodDraft } from './addFoodDraft'

/**
 * What the server learns of a dish waiting in Add food, so it can tell about it later (Settings ›
 * Notifications › Unsaved dish). The draft itself stays on the phone.
 */
type DraftNotice = { readonly label: string; readonly lineCount: number }

// matches cook_drafts.label
const MAX_LABEL = 120
const NAMED_LINES = 2

/** null: nothing worth telling (empty, or only a name without ingredients). */
export function draftNotice(draft: AddFoodDraft): DraftNotice | null {
  if (!hasContent(draft) || draft.dish.lines.length === 0) return null
  const names = draft.dish.lines.map((line) => line.item.name)
  const more = names.length - NAMED_LINES
  const label =
    draft.dish.name ?? names.slice(0, NAMED_LINES).join(', ') + (more > 0 ? ` +${more}` : '')
  return { label: label.slice(0, MAX_LABEL), lineCount: names.length }
}

/** Notes the waiting dish (which also restarts its clock), or forgets it. */
export async function sendDraftNotice(userId: string, notice: DraftNotice | null): Promise<void> {
  const { error } = notice
    ? await supabase
        .from('cook_drafts')
        .upsert({ user_id: userId, label: notice.label, line_count: notice.lineCount })
    : await supabase.from('cook_drafts').delete().eq('user_id', userId)
  if (error) throw ApiError.from(error)
}
