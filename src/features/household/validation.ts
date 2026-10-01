import { z } from 'zod'
import { INVITE_CODE_PATTERN, normalizeInviteCode } from './inviteCode'

const MAX_HOUSEHOLD_NAME_LENGTH = 60

export const householdNameSchema = z
  .string()
  .trim()
  .min(1, 'Enter a household name')
  .max(MAX_HOUSEHOLD_NAME_LENGTH, `Use at most ${MAX_HOUSEHOLD_NAME_LENGTH} characters`)

export const inviteCodeSchema = z
  .string()
  .transform(normalizeInviteCode)
  .pipe(z.string().regex(INVITE_CODE_PATTERN, 'Invite codes have 12 letters and numbers'))
