import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { Screen } from '../../components/ios/Screen'
import { SegmentedControl } from '../../components/ios/SegmentedControl'
import { TextField } from '../../components/ios/TextField'
import { toUserMessage } from '../../lib/errors'
import { useSignOut } from '../auth/useSignOut'
import { useCreateHousehold, useJoinHousehold } from './hooks'
import { householdNameSchema, inviteCodeSchema } from './validation'

type Mode = 'create' | 'join'

const MODE_OPTIONS = [
  { value: 'create', label: 'Create' },
  { value: 'join', label: 'Join' },
] as const

export function OnboardingScreen() {
  const [mode, setMode] = useState<Mode>('create')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [fieldError, setFieldError] = useState<string | undefined>()
  const createMutation = useCreateHousehold()
  const joinMutation = useJoinHousehold()
  const signOutMutation = useSignOut()
  const activeMutation = mode === 'create' ? createMutation : joinMutation

  function changeMode(next: Mode) {
    setMode(next)
    setFieldError(undefined)
    createMutation.reset()
    joinMutation.reset()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed =
      mode === 'create' ? householdNameSchema.safeParse(name) : inviteCodeSchema.safeParse(code)
    setFieldError(parsed.error?.issues[0]?.message)
    if (!parsed.success) return
    if (mode === 'create') createMutation.mutate(parsed.data)
    else joinMutation.mutate(parsed.data)
  }

  return (
    <Screen title="Welcome">
      <p className="text-[20px] font-semibold">Set up your household</p>
      <p className="mt-1 text-[15px] text-label-secondary">
        Create a household and share its invite code with your partner, or join theirs.
      </p>
      <div className="mt-6">
        <SegmentedControl
          label="Household"
          options={MODE_OPTIONS}
          value={mode}
          onChange={changeMode}
        />
      </div>
      <form noValidate onSubmit={handleSubmit}>
        {mode === 'create' ? (
          <GroupedSection footer="You can share the invite code afterwards.">
            <TextField
              label="Household name"
              placeholder="Household name, e.g. Home"
              value={name}
              onChange={(event) => setName(event.target.value)}
              error={fieldError}
            />
          </GroupedSection>
        ) : (
          <GroupedSection footer="Ask your partner for the 12-character code.">
            <TextField
              label="Invite code"
              autoCapitalize="characters"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              error={fieldError}
            />
          </GroupedSection>
        )}
        {activeMutation.isError && <ErrorBanner message={toUserMessage(activeMutation.error)} />}
        <div className="mt-6">
          <Button type="submit" loading={activeMutation.isPending}>
            {mode === 'create' ? 'Create household' : 'Join household'}
          </Button>
        </div>
      </form>
      {signOutMutation.isError && <ErrorBanner message={toUserMessage(signOutMutation.error)} />}
      <div className="mt-8 text-center">
        <Button variant="plain" onClick={() => signOutMutation.mutate()}>
          Log out
        </Button>
      </div>
    </Screen>
  )
}
