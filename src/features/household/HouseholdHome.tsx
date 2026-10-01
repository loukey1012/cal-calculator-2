import { useState } from 'react'
import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { Screen } from '../../components/ios/Screen'
import { toUserMessage } from '../../lib/errors'
import { useSignOut } from '../auth/useSignOut'
import { useHousehold, useMembers } from './hooks'
import type { Profile } from './householdApi'
import { formatInviteCode } from './inviteCode'
import { shareInviteCode } from './shareInvite'

type HouseholdHomeProps = { readonly profile: Profile; readonly householdId: string }

function memberLabel(member: Profile, currentUserId: string): string {
  const name = member.display_name || 'Unnamed'
  return member.id === currentUserId ? `${name} (you)` : name
}

/** Placeholder home until the Today/History/Ingredients tabs arrive (Phase 4). */
export function HouseholdHome({ profile, householdId }: HouseholdHomeProps) {
  const household = useHousehold(householdId)
  const members = useMembers(householdId)
  const signOutMutation = useSignOut()
  const [copied, setCopied] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  const loadError = household.error ?? members.error

  async function handleShare(code: string) {
    setShareError(null)
    try {
      const outcome = await shareInviteCode(code)
      setCopied(outcome === 'copied')
    } catch (error) {
      setShareError(toUserMessage(error))
    }
  }

  return (
    <Screen title="CALculator2">
      <p className="text-[20px] font-semibold">Hi, {profile.display_name || 'there'}</p>
      <p className="mt-1 text-[15px] text-label-secondary">
        Meals, history and ingredients are coming next.
      </p>
      {loadError && <ErrorBanner message={toUserMessage(loadError)} />}
      {household.data && (
        <GroupedSection header="Household">
          <div className="px-4 py-3 text-[17px]">{household.data.name}</div>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-[13px] text-label-secondary">Invite code</p>
              <p className="font-mono text-[17px] tracking-wider">
                {formatInviteCode(household.data.invite_code)}
              </p>
            </div>
            <Button
              variant="plain"
              aria-label="Share invite code"
              onClick={() => void handleShare(household.data.invite_code)}
            >
              {copied ? 'Copied' : 'Share'}
            </Button>
          </div>
        </GroupedSection>
      )}
      {shareError && <ErrorBanner message={shareError} />}
      {members.data && (
        <GroupedSection header="Members">
          {members.data.map((member) => (
            <div key={member.id} className="px-4 py-3 text-[17px]">
              {memberLabel(member, profile.id)}
            </div>
          ))}
        </GroupedSection>
      )}
      {signOutMutation.isError && <ErrorBanner message={toUserMessage(signOutMutation.error)} />}
      <div className="mt-8">
        <Button
          variant="destructive"
          loading={signOutMutation.isPending}
          onClick={() => signOutMutation.mutate()}
        >
          Log out
        </Button>
      </div>
    </Screen>
  )
}
