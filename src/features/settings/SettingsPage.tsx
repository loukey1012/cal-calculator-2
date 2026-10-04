import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useCurrentUser } from '../../app/currentUser'
import { Avatar } from '../../components/ios/Avatar'
import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { ListRow } from '../../components/ios/ListRow'
import { PageHeader } from '../../components/ios/PageHeader'
import { toUserMessage } from '../../lib/errors'
import { parseAppearance, type Appearance } from '../appearance/appearance'
import { AppearancePage } from '../appearance/AppearancePage'
import { useSignOut } from '../auth/useSignOut'
import { describeGoal } from '../goals/goalForm'
import { GoalSheet } from '../goals/GoalSheet'
import { useGoals } from '../goals/hooks'
import { displayName, useHousehold, useMembers } from '../household/hooks'
import type { Profile } from '../household/householdApi'
import { formatInviteCode } from '../household/inviteCode'
import { shareInviteCode } from '../household/shareInvite'
import { goalForDate, type Goal } from '../nutrition/goals'
import { useToday } from '../today/useToday'
import { AccountSection } from './AccountSection'
import { ScreenInfo } from './ScreenInfo'

/** A failed load must not look like "no goal", which would invite overwriting it. */
function goalDetail(loading: boolean, missing: boolean, goal: Goal | null): string {
  if (loading) return '…'
  return missing ? 'Couldn’t load' : describeGoal(goal)
}

const APPEARANCE_PATH = '/settings/appearance'

function memberLabel(member: Profile, currentUserId: string): string {
  const name = displayName(member)
  return member.id === currentUserId ? `${name} (you)` : name
}

function appearanceSummary({ theme, darkStyle }: Appearance): string {
  const style = darkStyle === 'bento' ? 'Bento' : 'Soft'
  if (theme === 'light') return 'Light'
  return theme === 'dark' ? `Dark · ${style}` : `System · ${style}`
}

/** Settings, or its Appearance page (kept in the URL like the selected history day). */
export function SettingsPage() {
  const { pathname } = useLocation()
  return pathname === APPEARANCE_PATH ? <AppearancePage /> : <SettingsOverview />
}

function SettingsOverview() {
  const navigate = useNavigate()
  const { profile, householdId } = useCurrentUser()
  const household = useHousehold(householdId)
  const members = useMembers(householdId)
  const signOutMutation = useSignOut()
  const [copied, setCopied] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  const [editingGoal, setEditingGoal] = useState(false)
  const today = useToday()
  const goals = useGoals(profile.id)
  const currentGoal = goalForDate(goals.data ?? [], today)
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
    <>
      <PageHeader title="Settings" />
      <AccountSection profile={profile} />
      <GroupedSection header="Look">
        <ListRow
          title="Appearance"
          detail={appearanceSummary(parseAppearance(profile.appearance))}
          onClick={() => navigate(APPEARANCE_PATH, { replace: true })}
        />
      </GroupedSection>
      <GroupedSection header="Goals">
        <ListRow
          title="Daily goal"
          detail={goalDetail(goals.isPending, goals.data === undefined, currentGoal)}
          onClick={() => setEditingGoal(true)}
        />
      </GroupedSection>
      <GoalSheet
        open={editingGoal}
        userId={profile.id}
        date={today}
        current={currentGoal}
        onClose={() => setEditingGoal(false)}
      />
      {loadError && <ErrorBanner message={toUserMessage(loadError)} />}
      {household.data && (
        <GroupedSection header="Household">
          <ListRow title={household.data.name} />
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
            <ListRow
              key={member.id}
              leading={<Avatar name={displayName(member)} color={member.accent_color} />}
              title={memberLabel(member, profile.id)}
            />
          ))}
        </GroupedSection>
      )}
      {signOutMutation.isError && <ErrorBanner message={toUserMessage(signOutMutation.error)} />}
      <ScreenInfo />
      <div className="mt-8">
        <Button
          variant="destructive"
          loading={signOutMutation.isPending}
          onClick={() => signOutMutation.mutate()}
        >
          Log out
        </Button>
      </div>
    </>
  )
}
