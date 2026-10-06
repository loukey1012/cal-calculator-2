import { useState } from 'react'
import { useNavigate } from 'react-router'
import { usePagePath } from '../../app/pagePath'
import { useCurrentUser } from '../../app/currentUser'
import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { ListRow } from '../../components/ios/ListRow'
import { PageHeader } from '../../components/ios/PageHeader'
import { toUserMessage } from '../../lib/errors'
import { parseAppearance } from '../appearance/appearance'
import { APPEARANCE_PATH, appColorsSummary } from '../appearance/appearanceLabels'
import { AppearancePage } from '../appearance/AppearancePage'
import { CategoriesPage } from '../categories/CategoriesPage'
import { useSignOut } from '../auth/useSignOut'
import { describeGoal } from '../goals/goalForm'
import { GoalSheet } from '../goals/GoalSheet'
import { useGoals } from '../goals/hooks'
import { useHousehold, useMembers } from '../household/hooks'
import { PARTNER_PATH, PartnerPage } from '../household/PartnerPage'
import { displayName, type PersonLook } from '../household/partnerLook'
import { PersonBadge } from '../household/PersonBadge'
import { useLookOf } from '../household/usePersonLook'
import { formatInviteCode } from '../household/inviteCode'
import { shareInviteCode } from '../household/shareInvite'
import { goalForDate, type Goal } from '../nutrition/goals'
import { useToday } from '../today/useToday'
import { AccountSection } from './AccountSection'

/** A failed load must not look like "no goal", which would invite overwriting it. */
function goalDetail(loading: boolean, missing: boolean, goal: Goal | null): string {
  if (loading) return '…'
  return missing ? 'Couldn’t load' : describeGoal(goal)
}

const CATEGORIES_PATH = '/settings/categories'

function memberLabel(look: PersonLook, isYou: boolean): string {
  return isYou ? `${look.name} (you)` : look.name
}

/** Settings, or one of its pages (kept in the URL like the selected history day). */
export function SettingsPage() {
  const pathname = usePagePath()
  if (pathname === APPEARANCE_PATH || pathname.startsWith(`${APPEARANCE_PATH}/`))
    return <AppearancePage />
  if (pathname === CATEGORIES_PATH) return <CategoriesPage />
  if (pathname === PARTNER_PATH) return <PartnerPage />
  return <SettingsOverview />
}

function SettingsOverview() {
  const navigate = useNavigate()
  const { profile, householdId } = useCurrentUser()
  const household = useHousehold(householdId)
  const members = useMembers(householdId)
  const lookOf = useLookOf()
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
          detail={appColorsSummary(parseAppearance(profile.appearance))}
          onClick={() => navigate(APPEARANCE_PATH, { replace: true })}
        />
      </GroupedSection>
      <GroupedSection header="Ingredients">
        <ListRow title="Categories" onClick={() => navigate(CATEGORIES_PATH, { replace: true })} />
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
          {members.data.map((member) => {
            const look = lookOf(member)
            const isYou = member.id === profile.id
            return (
              <ListRow
                key={member.id}
                leading={<PersonBadge look={look} />}
                title={memberLabel(look, isYou)}
                // your partner's account name, next to the nickname you gave them
                detail={isYou ? undefined : displayName(member)}
                onClick={isYou ? undefined : () => navigate(PARTNER_PATH, { replace: true })}
              />
            )
          })}
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
    </>
  )
}
